import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { getRouteDetails } from '@/lib/maps.js'
import { createTripSchema } from '@/schemas/index.js'

export async function POST(request) {
    try {
        const auth = await getAuthUser(request)
        if (auth.error) return NextResponse.json(
            { error: auth.error },
            { status: auth.status }
        )

        if (auth.user.role === 'RIDER') {
            return NextResponse.json(
                { error: 'Only drivers can create trips' },
                { status: 403 }
            )
        }

        const body = await request.json()

        const result = createTripSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.issues?.[0]?.message || 'Validation failed' },
                { status: 400 }
            )
        }

        const {
            carId,
            originCity,
            destCity,
            departureTime,
            pricePerKm,
            allowSharing,
            offerReturn,
            estimatedReturnDate
        } = result.data

        const car = await prisma.car.findUnique({ where: { id: carId } })

        if (!car || car.ownerId !== auth.user.id || !car.isActive) {
            return NextResponse.json(
                { error: 'Car not found or not available' },
                { status: 404 }
            )
        }

        let routeData
        try {
            routeData = await getRouteDetails(originCity, destCity)
        } catch (mapError) {
            return NextResponse.json(
                { error: `Could not calculate route: ${mapError.message}` },
                { status: 400 }
            )
        }

        const {
            cities,
            distanceKm,
            encodedPolyline,
            cityETAs,
            cityCoordinates,
            originLat,
            originLng,
            destinationLat,
            destinationLng,
        } = routeData

        const departure = new Date(departureTime)
        const totalDurationMs = (cityETAs[cities[cities.length - 1]]) * 1000
        const estimatedArrival = new Date(departure.getTime() + totalDurationMs)

        const trip = await prisma.$transaction(async (tx) => {
            const newTrip = await tx.trip.create({
                data: {
                    driverId: auth.user.id,
                    carId,
                    originCity: cities[0],
                    destinationCity: cities[cities.length - 1],
                    originLat,
                    originLng,
                    destinationLat,
                    destinationLng,
                    departureTime: departure,
                    estimatedArrival,
                    routeCities: cities,
                    totalSeats: car.totalSeats,
                    pricePerKm,
                    distanceKm,
                    encodedPolyline,
                    allowSharing,
                }
            })

            const waypointData = cities.map((city, index) => {
                const etaSeconds = cityETAs[city] || 0
                const waypointArrival = new Date(departure.getTime() + etaSeconds * 1000)
                const coords = cityCoordinates?.[city]
                return {
                    tripId: newTrip.id,
                    cityName: city,
                    lat: coords?.lat ?? 0,
                    lng: coords?.lng ?? 0,
                    sequenceIndex: index,
                    estimatedArrival: waypointArrival,
                }
            })

            await tx.waypoint.createMany({ data: waypointData })

            if (offerReturn && estimatedReturnDate) {
                await tx.returnSlot.create({
                    data: {
                        tripId: newTrip.id,
                        returnOrigin: cities[cities.length - 1],
                        returnDestination: cities[0],
                        estimatedReturnDate: new Date(estimatedReturnDate),
                        status: 'OPEN',
                    }
                })
            }

            return newTrip
        })

        const fullTrip = await prisma.trip.findUnique({
            where: { id: trip.id },
            include: {
                waypoints: { orderBy: { sequenceIndex: 'asc' } },
                returnSlot: true,
                car: true,
            }
        })

        return NextResponse.json({ trip: fullTrip }, { status: 201 })

    } catch (error) {
        console.error('[CREATE TRIP ERROR]', error)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 }
        )
    }
}