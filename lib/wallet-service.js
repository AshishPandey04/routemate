import prisma from '@/lib/prisma.js'

/** Driver share of booking amount (platform keeps the rest). */
export const DRIVER_SHARE = Number(process.env.DRIVER_EARNINGS_SHARE || '0.85')

function roundAmount(n) {
  return Math.round(n * 100) / 100
}

export async function getOrCreateWallet(tx, userId) {
  let wallet = await tx.wallet.findUnique({ where: { userId } })
  if (!wallet) {
    wallet = await tx.wallet.create({ data: { userId } })
  }
  return wallet
}

/**
 * Credit driver pending balance when a booking is paid.
 */
export async function creditDriverOnBooking(bookingId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { trip: { select: { driverId: true, id: true } } },
  })
  if (!booking?.trip) return

  const earning = roundAmount(booking.totalAmount * DRIVER_SHARE)

  await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, booking.trip.driverId)
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { pendingBalance: { increment: earning } },
    })
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'EARNING_PENDING',
        amount: earning,
        bookingId: booking.id,
        tripId: booking.tripId,
        description: `Trip earning: ${booking.boardingCity} → ${booking.alightingCity}`,
      },
    })
  })
}

/**
 * Move pending trip earnings to available balance when trip completes.
 */
export async function releaseTripEarnings(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { driverId: true },
  })
  if (!trip) return

  const pendingTxs = await prisma.walletTransaction.findMany({
    where: {
      tripId,
      type: 'EARNING_PENDING',
      releasedAt: null,
    },
  })

  if (pendingTxs.length === 0) return

  const total = roundAmount(pendingTxs.reduce((s, t) => s + t.amount, 0))

  await prisma.$transaction(async (tx) => {
    const wallet = await getOrCreateWallet(tx, trip.driverId)

    for (const t of pendingTxs) {
      await tx.walletTransaction.update({
        where: { id: t.id },
        data: { releasedAt: new Date(), type: 'EARNING' },
      })
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: { decrement: total },
        balance: { increment: total },
      },
    })
  })
}

/**
 * Reverse driver earning when booking is cancelled (before or after release).
 */
export async function reverseBookingEarning(bookingId) {
  const txs = await prisma.walletTransaction.findMany({
    where: { bookingId, type: { in: ['EARNING_PENDING', 'EARNING'] } },
  })

  for (const t of txs) {
    await prisma.$transaction(async (tx) => {
      if (!t.releasedAt) {
        await tx.wallet.update({
          where: { id: t.walletId },
          data: { pendingBalance: { decrement: t.amount } },
        })
      } else {
        await tx.wallet.update({
          where: { id: t.walletId },
          data: { balance: { decrement: t.amount } },
        })
      }

      await tx.walletTransaction.update({
        where: { id: t.id },
        data: {
          type: 'REVERSAL',
          description: 'Reversed due to cancellation',
        },
      })
    })
  }
}

/**
 * Driver requests withdrawal from available balance.
 */
export async function requestPayout(userId, amount) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  if (!wallet) throw new Error('Wallet not found')
  if (amount < 100) throw new Error('Minimum payout is ₹100')
  if (amount > wallet.balance) throw new Error('Insufficient balance')

  return prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    })

    const payout = await tx.payout.create({
      data: { walletId: wallet.id, amount, status: 'PENDING' },
    })

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'PAYOUT',
        amount: -amount,
        description: `Payout request ${payout.id.slice(0, 8)}`,
        releasedAt: new Date(),
      },
    })

    return payout
  })
}
