import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { userId } = await params

    const ratings = await prisma.rating.findMany({
      where:   { rateeId: userId },
      include: { rater: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take:    20
    })

    const avgScore = ratings.length
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : null

    return NextResponse.json({
      averageScore: avgScore ? parseFloat(avgScore) : null,
      totalRatings: ratings.length,
      recent:       ratings.map(r => ({
        score:     r.score,
        comment:   r.comment,
        type:      r.type,
        raterName: r.rater.name,
        createdAt: r.createdAt,
      }))
    })

  } catch (error) {
    console.error('[GET RATINGS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
