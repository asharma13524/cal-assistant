export interface CalendarEvent {
  id: string
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
    displayName?: string
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  }>
  location?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
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