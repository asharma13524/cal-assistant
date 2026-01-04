import { google } from 'googleapis'
import { getAuthenticatedClient } from './oauth'
import { DEFAULT_EVENT_RANGE_DAYS, DEFAULT_MAX_RESULTS, STATS_MAX_RESULTS, TOP_ATTENDEES_COUNT } from '@/lib/constants'
import type { CalendarEvent, CreateEventData, UpdateEventData } from '@/lib/types/calendar'

/**
 * Transform a Google Calendar API event object to our CalendarEvent type
 */
function transformGoogleEvent(event: any, defaultSummary = '(No title)'): CalendarEvent {
  return {
    id: event.id || '',
    summary: event.summary || defaultSummary,
    description: event.description || undefined,
    start: {
      dateTime: event.start?.dateTime || event.start?.date || '',
      timeZone: event.start?.timeZone || undefined,
    },
    end: {
      dateTime: event.end?.dateTime || event.end?.date || '',
      timeZone: event.end?.timeZone || undefined,
    },
    attendees: event.attendees?.map((a: any) => ({
      email: a.email || '',
      displayName: a.displayName || undefined,
      responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
    })),
    location: event.location || undefined,
    status: event.status as CalendarEvent['status'],
    htmlLink: event.htmlLink || undefined,
  }
}

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

  return events.map((event) => transformGoogleEvent(event))
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

  return transformGoogleEvent(event, '')
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
      .slice(0, TOP_ATTENDEES_COUNT)
      .map(([email, count]) => ({ email, meetingCount: count })),
    averageMeetingsPerDay: Math.round(events.length / 7 * 10) / 10,
  }
}

export async function updateCalendarEvent(
  accessToken: string,
  eventData: UpdateEventData
): Promise<CalendarEvent> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const updateBody: Record<string, unknown> = {}
  if (eventData.summary !== undefined) updateBody.summary = eventData.summary
  if (eventData.description !== undefined) updateBody.description = eventData.description
  if (eventData.start !== undefined) updateBody.start = eventData.start
  if (eventData.end !== undefined) updateBody.end = eventData.end
  if (eventData.attendees !== undefined) updateBody.attendees = eventData.attendees
  if (eventData.location !== undefined) updateBody.location = eventData.location

  try {
    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventData.eventId,
      requestBody: updateBody,
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
      htmlLink: event.htmlLink || undefined,
    }
  } catch (error: unknown) {
    // Handle 404 - event doesn't exist
    if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
      throw new Error(`Event with ID "${eventData.eventId}" not found. It may have been deleted or the ID is incorrect. Please call get_calendar_events to get the current event ID.`)
    }
    throw error
  }
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<{ deleted: boolean; eventTitle?: string }> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  // First, verify the event exists and get its details
  let eventTitle: string | undefined
  try {
    const getResponse = await calendar.events.get({
      calendarId: 'primary',
      eventId,
    })
    eventTitle = getResponse.data.summary || 'Untitled'
  } catch (error) {
    console.error(`[Calendar] Event not found for deletion: ${eventId}`, error)
    throw new Error(`Event not found with ID: ${eventId}. The event may have already been deleted or the ID is incorrect.`)
  }

  // Now delete the event
  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
  })

  return { deleted: true, eventTitle }
}

export async function addEventAttendee(
  accessToken: string,
  eventId: string,
  email: string
): Promise<CalendarEvent> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  // Get the current event
  const getResponse = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  })

  const currentEvent = getResponse.data
  const currentAttendees = currentEvent.attendees || []

  // Check if attendee already exists
  const attendeeExists = currentAttendees.some((a) => a.email === email)
  if (attendeeExists) {
    throw new Error(`Attendee ${email} is already invited to this event`)
  }

  // Add the new attendee
  const updatedAttendees = [...currentAttendees, { email }]

  // Update the event
  const updateResponse = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      attendees: updatedAttendees,
    },
  })

  const event = updateResponse.data

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

export async function removeEventAttendee(
  accessToken: string,
  eventId: string,
  email: string
): Promise<CalendarEvent> {
  const auth = getAuthenticatedClient(accessToken)
  const calendar = google.calendar({ version: 'v3', auth })

  // Get the current event
  const getResponse = await calendar.events.get({
    calendarId: 'primary',
    eventId,
  })

  const currentEvent = getResponse.data
  const currentAttendees = currentEvent.attendees || []

  // Filter out the attendee
  const updatedAttendees = currentAttendees.filter((a) => a.email !== email)

  // Check if attendee was actually removed
  if (updatedAttendees.length === currentAttendees.length) {
    throw new Error(`Attendee ${email} not found in this event`)
  }

  // Update the event
  const updateResponse = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      attendees: updatedAttendees,
    },
  })

  const event = updateResponse.data

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

