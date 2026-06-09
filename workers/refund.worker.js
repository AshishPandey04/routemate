import { loadEnvLocal } from '../lib/load-env.js'

loadEnvLocal()

import { Worker, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import prisma from '../lib/prisma.js'
import { initiateRefund } from '../lib/razorpay.js'
import { sendPushNotification } from '../lib/fcm.js'

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
})

export const refundQueue = new Queue('refunds', {
  connection,
  defaultJobOptions: {
    attempts:    5,
    backoff:     { type: 'exponential', delay: 30_000 }, // 30s, 1m, 2m, 4m, 8m
    removeOnComplete: 100,
    removeOnFail:     200,
  },
})

const worker = new Worker(
  'refunds',
  async (job) => {
    const { paymentId, amount, bookingId, paymentRecordId } = job.data

    console.log(`[REFUND WORKER] Processing refund for booking ${bookingId}, attempt ${job.attemptsMade + 1}`)

    const refund = await initiateRefund(paymentId, amount)

    // Update payment record with refund ID
    await prisma.payment.update({
      where: { id: paymentRecordId },
      data:  { refundId: refund.id },
    })

    // Notify rider that refund was processed
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { user: { select: { fcmToken: true, name: true } } },
    })

    if (booking?.user?.fcmToken) {
      await sendPushNotification(
        booking.user.fcmToken,
        '💸 Refund Initiated',
        `Your refund of ₹${amount} has been initiated and will reflect in 5–7 business days.`,
        { type: 'REFUND_INITIATED', bookingId }
      )
    }

    console.log(`[REFUND WORKER] Refund ${refund.id} processed for booking ${bookingId}`)
  },
  { connection }
)

worker.on('failed', (job, err) => {
  console.error(`[REFUND WORKER] Job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message)
})

worker.on('completed', (job) => {
  console.log(`[REFUND WORKER] Job ${job.id} completed`)
})

console.log('[REFUND WORKER] Started')
