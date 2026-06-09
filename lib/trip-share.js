import crypto from 'crypto'
import prisma from '@/lib/prisma.js'

export function buildShareUrl(token) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/share/${token}`
}

/**
 * Get or create a share link for an active trip (driver or passenger).
 */
export async function getOrCreateTripShareLink(tripId) {
  const existing = await prisma.tripShareLink.findUnique({
    where: { tripId },
  })

  if (existing?.isActive) {
    return { link: existing, url: buildShareUrl(existing.token) }
  }

  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const link = await prisma.tripShareLink.upsert({
    where: { tripId },
    create: { tripId, token, expiresAt, isActive: true },
    update: { token, expiresAt, isActive: true },
  })

  return { link, url: buildShareUrl(link.token) }
}

export async function getTripByShareToken(token) {
  const share = await prisma.tripShareLink.findUnique({
    where: { token },
    include: {
      trip: {
        include: {
          driver: { select: { name: true, phone: true } },
          waypoints: { orderBy: { sequenceIndex: 'asc' } },
        },
      },
    },
  })

  if (!share?.isActive) return null
  if (share.expiresAt && share.expiresAt < new Date()) return null

  return share
}
