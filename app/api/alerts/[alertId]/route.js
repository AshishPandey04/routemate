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

    const { alertId } = await params

    // Try route alert first
    const routeAlert = await prisma.routeAlert.findUnique({
      where: { id: alertId }
    })

    if (routeAlert) {
      if (routeAlert.userId !== auth.user.id) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403 }
        )
      }
      await prisma.routeAlert.delete({ where: { id: alertId } })
      return NextResponse.json({ message: 'Alert removed' })
    }

    // Try return alert
    const returnAlert = await prisma.returnAlert.findUnique({
      where: { id: alertId }
    })

    if (returnAlert) {
      if (returnAlert.userId !== auth.user.id) {
        return NextResponse.json(
          { error: 'Not authorized' },
          { status: 403 }
        )
      }
      await prisma.returnAlert.delete({ where: { id: alertId } })
      return NextResponse.json({ message: 'Alert removed' })
    }

    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('[DELETE ALERT ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}