import { NextResponse } from 'next/server'
import { getCitySuggestions } from '@/lib/maps.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ cities: [] })
    }

    const cities = await getCitySuggestions(query)

    return NextResponse.json({ cities })

  } catch (error) {
    console.error('[CITY SEARCH ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to fetch city suggestions' },
      { status: 500 }
    )
  }
}