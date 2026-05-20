import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { carSchema } from '@/schemas/index.js'

// GET /api/cars — get all cars owned by logged-in driver
export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const cars = await prisma.car.findMany({
      where: {
        ownerId:  auth.user.id,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ cars })

  } catch (error) {
    console.error('[GET CARS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// POST /api/cars — register a new car
export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    // Only drivers can register cars
    if (auth.user.role === 'RIDER') {
      return NextResponse.json(
        { error: 'Only drivers can register cars' },
        { status: 403 }
      )
    }

    const body   = await request.json()
    const result = carSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { make, model, year, plateNumber, totalSeats, isAC } = result.data

    // Check plate number uniqueness
    const existing = await prisma.car.findUnique({
      where: { plateNumber }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A car with this plate number already exists' },
        { status: 400 }
      )
    }

    const car = await prisma.car.create({
      data: {
        ownerId: auth.user.id,
        make,
        model,
        year,
        plateNumber,
        totalSeats,
        isAC,
      }
    })

    return NextResponse.json({ car }, { status: 201 })

  } catch (error) {
    console.error('[CREATE CAR ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}