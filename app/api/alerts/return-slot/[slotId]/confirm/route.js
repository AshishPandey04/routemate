import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { getRouteDetails } from '@/lib/maps.js'
import { sendMulticastNotification } from '@/lib/fcm.js'
import { z } from 'zod'

const schema = z.object({
  confirmedReturnDate: z.string().min(1)
})

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { slotId } = await params
    const body        = await request.json()
    const result      = schema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid date' },
        { status: 400 }
      )
    }

    const { confirmedReturnDate } = result.data

    // Get return slot + original trip
    const slot = await prisma.returnSlot.findUnique({
      where:   { id: slotId },
      include: {
        trip:         true,
        returnAlerts: {
          include: { user: true }
        }
      }
    })

    if (!slot) {
      return NextResponse.json(
        { error: 'Return slot not found' },
        { status: 404 }
      )
    }

    // Verify driver owns original trip
    if (slot.trip.driverId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      )
    }

    if (slot.status === 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Return trip already confirmed' },
        { status: 400 }
      )
    }

    // Get return route from Maps
    const routeData = await getRouteDetails(
      slot.returnOrigin,
      slot.returnDestination
    )

    const departure        = new Date(confirmedReturnDate)
    const totalDurationMs  = routeData.cityETAs[routeData.cities[routeData.cities.length - 1]] * 1000
    const estimatedArrival = new Date(departure.getTime() + totalDurationMs)

    // Create return trip + update slot in transaction
    const returnTrip = await prisma.$transaction(async (tx) => {

      // Create full return trip
      const newTrip = await tx.trip.create({
        data: {
          driverId:        slot.trip.driverId,
          carId:           slot.trip.carId,
          originCity:      slot.returnOrigin,
          destinationCity: slot.returnDestination,
          originLat:       routeData.originLat,
          originLng:       routeData.originLng,
          destinationLat:  routeData.destinationLat,
          destinationLng:  routeData.destinationLng,
          departureTime:   departure,
          estimatedArrival,
          routeCities:     routeData.cities,
          totalSeats:      slot.trip.totalSeats,
          pricePerKm:      slot.trip.pricePerKm,
          distanceKm:      routeData.distanceKm,
          encodedPolyline: routeData.encodedPolyline,
          allowSharing:    slot.trip.allowSharing,
        }
      })

      // Create waypoints
      const waypointData = routeData.cities.map((city, index) => ({
        tripId:          newTrip.id,
        cityName:        city,
        lat:             0,
        lng:             0,
        sequenceIndex:   index,
        estimatedArrival: new Date(
          departure.getTime() +
          (routeData.cityETAs[city] || 0) * 1000
        ),
      }))

      await tx.waypoint.createMany({ data: waypointData })

      // Update return slot
      await tx.returnSlot.update({
        where: { id: slotId },
        data: {
          status:      'CONFIRMED',
          returnTripId: newTrip.id,
          estimatedReturnDate: departure,
        }
      })

      return newTrip
    })

    // Notify all users watching this return slot
    const watcherTokens = slot.returnAlerts
      .map(alert => alert.user.fcmToken)
      .filter(Boolean)

    if (watcherTokens.length > 0) {
      await sendMulticastNotification(
        watcherTokens,
        '🚗 Return Trip Confirmed!',
        `A car from ${slot.returnOrigin} to ${slot.returnDestination} is now available on ${new Date(confirmedReturnDate).toLocaleDateString()}`,
        {
          type:        'RETURN_TRIP_CONFIRMED',
          returnTripId: returnTrip.id,
        }
      )
    }

    // Mark all return alerts as notified
    await prisma.returnAlert.updateMany({
      where: { returnSlotId: slotId },
      data:  { notified: true }
    })

    return NextResponse.json({
      message:       'Return trip confirmed',
      returnTripId:  returnTrip.id,
      notifiedUsers: watcherTokens.length,
    })

  } catch (error) {
    console.error('[CONFIRM RETURN ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}