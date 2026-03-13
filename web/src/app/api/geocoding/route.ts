import { NextRequest, NextResponse } from 'next/server'

// GET /api/geocoding?q=Vancouver&limit=5
// Proxies to OpenWeatherMap Geocoding API to avoid exposing the API key.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q || q.trim().length < 2) {
    return NextResponse.json([], { status: 200 })
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Weather API not configured' }, { status: 500 })
  }

  const limit = req.nextUrl.searchParams.get('limit') ?? '5'
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=${limit}&appid=${apiKey}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding API error' }, { status: res.status })
    }

    const data = await res.json()

    // Return simplified results
    const results = (data as Array<{
      name: string
      local_names?: Record<string, string>
      lat: number
      lon: number
      country: string
      state?: string
    }>).map((item) => ({
      name: item.name,
      local_names: item.local_names ?? {},
      lat: Math.round(item.lat * 10000) / 10000,
      lon: Math.round(item.lon * 10000) / 10000,
      country: item.country,
      state: item.state ?? '',
    }))

    return NextResponse.json(results)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch geocoding data' }, { status: 500 })
  }
}
