import { google } from 'googleapis'
import { getAuthenticatedClient } from './oauth'
import { DEFAULT_EVENT_RANGE_DAYS, DEFAULT_MAX_RESULTS, STATS_MAX_RESULTS } from '@/lib/constants'
import type { CalendarEvent, CreateEventData } from '@/lib/types/calendar'

export async function getCalendarEvents(
  accessToken: string,
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = DEFAULT_MAX_RESULTS
): Promise<CalendarEvent[]> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  // Default to current week if no dates provided
  const now = new Date()
  const defaultTimeMin = timeMin || (() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return d
  })()
  const defaultTimeMax = timeMax || (() => {
    const d = new Date()
    d.setDate(d.getDate() + DEFAULT_EVENT_RANGE_DAYS)
    return d
  })()

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: defaultTimeMin.toISOString(),
    timeMax: defaultTimeMax.toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  const events = response.data.items || []

  return events.map((event) => ({
    id: event.id || '',
    summary: event.summary || '(No title)',
    description: event.description || undefined,
    start: {
      dateTime: event.start?.dateTime || event.start?.date || '',
      timeZone: event.start?.timeZone || undefined,
    },
    end: {
      dateTime: event.end?.dateTime || event.end?.date || '',
      timeZone: event.end?.timeZone || undefined,
    },
    attendees: event.attendees?.map((a) => ({
      email: a.email || '',
      displayName: a.displayName || undefined,
      responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
    })),
    location: event.location || undefined,
    status: event.status as CalendarEvent['status'],
    htmlLink: event.htmlLink || undefined,
  }))
}

export async function createCalendarEvent(
  accessToken: string,
  eventData: CreateEventData
): Promise<CalendarEvent> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: eventData.summary,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
      attendees: eventData.attendees,
      location: eventData.location,
    },
  })

  const event = response.data

  return {
    id: event.id || '',
    summary: event.summary || '',
    description: event.description || undefined,
    start: {
      dateTime: event.start?.dateTime || event.start?.date || '',
      timeZone: event.start?.timeZone || undefined,
    },
    end: {
      dateTime: event.end?.dateTime || event.end?.date || '',
      timeZone: event.end?.timeZone || undefined,
    },
    attendees: event.attendees?.map((a) => ({
      email: a.email || '',
      displayName: a.displayName || undefined,
      responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
    })),
    location: event.location || undefined,
    status: event.status as CalendarEvent['status'],
    htmlLink: event.htmlLink || undefined,
  }
}

export async function getCalendarStats(accessToken: string) {
  // Get events for the current week
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)

  const events = await getCalendarEvents(accessToken, startOfWeek, endOfWeek, STATS_MAX_RESULTS)

  let totalMeetingMinutes = 0
  const meetingsByDay: Record<string, number> = {}
  const attendeeCounts: Record<string, number> = {}

  for (const event of events) {
    if (!event.start.dateTime || !event.end.dateTime) continue

    const start = new Date(event.start.dateTime)
    const end = new Date(event.end.dateTime)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)

    totalMeetingMinutes += durationMinutes

    const dayKey = start.toLocaleDateString('en-US', { weekday: 'long' })
    meetingsByDay[dayKey] = (meetingsByDay[dayKey] || 0) + durationMinutes

    if (event.attendees) {
      for (const attendee of event.attendees) {
        attendeeCounts[attendee.email] = (attendeeCounts[attendee.email] || 0) + 1
      }
    }
  }

  return {
    totalEvents: events.length,
    totalMeetingMinutes,
    totalMeetingHours: Math.round(totalMeetingMinutes / 60 * 10) / 10,
    meetingsByDay,
    topAttendees: Object.entries(attendeeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([email, count]) => ({ email, meetingCount: count })),
    averageMeetingsPerDay: Math.round(events.length / 7 * 10) / 10,
  }
}

