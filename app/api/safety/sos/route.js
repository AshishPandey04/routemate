import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { sosSchema } from '@/schemas/index.js'
import { getOrCreateTripShareLink } from '@/lib/trip-share.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const result = sosSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { tripId, lat, lng, message } = result.data

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          select: {
            name: true,
            phone: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
          },
        },
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            user: {
              select: {
                name: true,
                phone: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
              },
            },
          },
        },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const isDriver = trip.driverId === auth.user.id
    const passengerBooking = trip.bookings.find((b) => b.userId === auth.user.id)

    if (!isDriver && !passengerBooking) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const alert = await prisma.sosAlert.create({
      data: {
        tripId,
        userId: auth.user.id,
        lat,
        lng,
        message: message || 'SOS triggered',
      },
    })

    const { url: shareUrl } = await getOrCreateTripShareLink(tripId)

    const reporter = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        name: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    })

    console.log(
      `[SOS ALERT] trip=${tripId} user=${auth.user.id} lat=${lat} lng=${lng}`
    )

    return NextResponse.json({
      message: 'SOS alert recorded. Share your live link with emergency contacts.',
      alert,
      shareUrl,
      emergencyContact: {
        name: reporter.emergencyContactName,
        phone: reporter.emergencyContactPhone,
      },
      trip: {
        route: `${trip.originCity} → ${trip.destinationCity}`,
        status: trip.status,
        driverPhone: isDriver ? null : trip.driver.phone,
      },
    })
  } catch (error) {
    console.error('[SOS]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
