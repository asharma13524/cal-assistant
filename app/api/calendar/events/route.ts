import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/auth/session'
import { getCalendarEvents } from '@/lib/google/calendar'

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      console.log('[Calendar API] No valid access token')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')

    console.log('[Calendar API] Fetching events:', {
      timeMin: timeMin || 'default',
      timeMax: timeMax || 'default'
    })

    const events = await getCalendarEvents(
      accessToken,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined
    )

    console.log(`[Calendar API] Found ${events.length} events`)
    return NextResponse.json({ events })
  } catch (error) {
    console.error('[Calendar API] Error:', error)

    // Check if it's an auth error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('Invalid Credentials')) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: errorMessage },
      { status: 500 }
    )
  }
}
