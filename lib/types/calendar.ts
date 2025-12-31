export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  }>
  location?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
}

export interface CalendarEventWithColumn extends CalendarEvent {
  column?: number
  totalColumns?: number
}

export interface CreateEventData {
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
  }>
  location?: string
}

export interface UpdateEventData {
  eventId: string
  summary?: string
  description?: string
  start?: {
    dateTime: string
    timeZone?: string
  }
  end?: {
    dateTime: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
  }>
  location?: string
}

export interface AttendeeOperation {
  eventId: string
  email: string
}

export type ViewMode = 'day' | 'week' | 'month' | 'year'

export interface EventPosition {
  top: number
  height: number
  left: string
  width: string
  zIndex: number
}