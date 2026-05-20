import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function DELETE(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { carId } = params

    // Verify car belongs to user
    const car = await prisma.car.findUnique({
      where: { id: carId }
    })

    if (!car || car.ownerId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      )
    }

    // Check no active trips on this car
    const activeTrip = await prisma.trip.findFirst({
      where: {
        carId,
        status: { in: ['SCHEDULED', 'IN_TRANSIT'] }
      }
    })

    if (activeTrip) {
      return NextResponse.json(
        { error: 'Car has active trips. Complete or cancel them first.' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.car.update({
      where: { id: carId },
      data:  { isActive: false }
    })

    return NextResponse.json({ message: 'Car removed successfully' })

  } catch (error) {
    console.error('[DELETE CAR ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}