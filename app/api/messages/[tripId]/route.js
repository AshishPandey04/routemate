import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

// GET — fetch message history
export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = await params

    // Verify user belongs to this trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    const isDriver = trip.driverId === auth.user.id
    const booking  = await prisma.booking.findFirst({
      where: { tripId, userId: auth.user.id, status: 'CONFIRMED' }
    })

    if (!isDriver && !booking) {
      return NextResponse.json(
        { error: 'You are not part of this trip' },
        { status: 403 }
      )
    }

    const messages = await prisma.message.findMany({
      where:   { tripId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take:    100
    })

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('[GET MESSAGES ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// POST — send a message
export async function POST(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = await params
    const { content } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Verify user belongs to this trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    const isDriver = trip.driverId === auth.user.id
    const booking  = await prisma.booking.findFirst({
      where: { tripId, userId: auth.user.id, status: 'CONFIRMED' }
    })

    if (!isDriver && !booking) {
      return NextResponse.json(
        { error: 'You are not part of this trip' },
        { status: 403 }
      )
    }

    const message = await prisma.message.create({
      data: {
        tripId,
        senderId: auth.user.id,
        content:  content.trim(),
      },
      include: { sender: { select: { id: true, name: true } } }
    })

    return NextResponse.json({ message }, { status: 201 })

  } catch (error) {
    console.error('[SEND MESSAGE ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}