import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/auth/session'
import { getCalendarEvents, createCalendarEvent } from '@/lib/google/calendar'
import type { CreateEventData } from '@/lib/types/calendar'

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const maxResults = searchParams.get('maxResults')

    const events = await getCalendarEvents(
      accessToken,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined,
      maxResults ? parseInt(maxResults, 10) : undefined
    )

    return NextResponse.json({ events })
  } catch (error) {
    console.error('[Calendar API] Error fetching events:', error)

    // Check if it's an auth error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('Invalid Credentials')) {
      return NextResponse.json(
        { error: 'Your session has expired. Please sign in again.' },
        { status: 401 }
      )
    }

    // Check for Google API errors
    if (errorMessage.includes('insufficient permissions') || errorMessage.includes('Insufficient Permission')) {
      return NextResponse.json(
        { error: 'Calendar access denied. Please sign in again and grant calendar permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: `Unable to load calendar events. ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.summary || !body.start?.dateTime || !body.end?.dateTime) {
      return NextResponse.json(
        { error: 'Missing required fields: summary, start.dateTime, end.dateTime' },
        { status: 400 }
      )
    }

    const eventData: CreateEventData = {
      summary: body.summary,
      description: body.description,
      start: body.start,
      end: body.end,
      attendees: body.attendees,
      location: body.location,
    }

    const createdEvent = await createCalendarEvent(accessToken, eventData)
    return NextResponse.json({ event: createdEvent }, { status: 201 })
  } catch (error) {
    console.error('[Calendar API] Error creating event:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('Invalid Credentials')) {
      return NextResponse.json(
        { error: 'Session expired. Please sign in again.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create calendar event', details: errorMessage },
      { status: 500 }
    )
  }
}
