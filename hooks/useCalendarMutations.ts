'use client'

import { useSWRConfig } from 'swr'
import type { CalendarEvent, CreateEventData, UpdateEventData } from '@/lib/types/calendar'

export function useCalendarMutations() {
  const { mutate } = useSWRConfig()

  const createEvent = async (eventData: CreateEventData): Promise<CalendarEvent> => {
    const response = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to create event')
    }

    const data = await response.json()
    const createdEvent = data.event

    // Optimistic update: Add event to all matching caches
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
      async (currentData: { events: CalendarEvent[] } | CalendarEvent[] | undefined) => {
        if (!currentData) return currentData

        // Handle both response formats
        const events = Array.isArray(currentData) ? currentData : currentData.events
        return Array.isArray(currentData)
          ? [...events, createdEvent]
          : { events: [...events, createdEvent] }
      },
      { revalidate: true }
    )

    return createdEvent
  }

  const updateEvent = async (eventData: UpdateEventData): Promise<CalendarEvent> => {
    // Optimistically update the event in the cache
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
      async (currentData: { events: CalendarEvent[] } | CalendarEvent[] | undefined) => {
        if (!currentData) return currentData

        // Handle both response formats
        const events = Array.isArray(currentData) ? currentData : currentData.events
        const updatedEvents = events.map((e) =>
          e.id === eventData.eventId
            ? {
                ...e,
                ...(eventData.summary && { summary: eventData.summary }),
                ...(eventData.description !== undefined && { description: eventData.description }),
                ...(eventData.location !== undefined && { location: eventData.location }),
                ...(eventData.start && { start: eventData.start }),
                ...(eventData.end && { end: eventData.end }),
              }
            : e
        )

        return Array.isArray(currentData)
          ? updatedEvents
          : { events: updatedEvents }
      },
      { revalidate: false, rollbackOnError: true }
    )

    // Perform the actual update
    const response = await fetch(`/api/calendar/events/${eventData.eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to update event')
    }

    const data = await response.json()

    // Revalidate all calendar event caches to sync with server
    mutate((key) => typeof key === 'string' && key.startsWith('/api/calendar/events'))

    return data.event
  }

  const deleteEvent = async (eventId: string): Promise<void> => {
    // Optimistic update: Remove event from all caches immediately
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
      async (currentData: { events: CalendarEvent[] } | CalendarEvent[] | undefined) => {
        if (!currentData) return currentData

        // Handle both response formats
        const events = Array.isArray(currentData) ? currentData : currentData.events
        const filteredEvents = events.filter((e) => e.id !== eventId)

        return Array.isArray(currentData)
          ? filteredEvents
          : { events: filteredEvents }
      },
      { revalidate: false, rollbackOnError: true }
    )

    // Perform the actual deletion
    const response = await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete event')
    }

    // Revalidate after successful deletion
    mutate((key) => typeof key === 'string' && key.startsWith('/api/calendar/events'))
  }

  const addAttendee = async (eventId: string, email: string): Promise<CalendarEvent> => {
    // Optimistically add the attendee to the event in the cache
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
      async (currentData: { events: CalendarEvent[] } | CalendarEvent[] | undefined) => {
        if (!currentData) return currentData

        // Handle both response formats
        const events = Array.isArray(currentData) ? currentData : currentData.events
        const updatedEvents = events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                attendees: [
                  ...(e.attendees || []),
                  { email, responseStatus: 'needsAction' as const },
                ],
              }
            : e
        )

        return Array.isArray(currentData)
          ? updatedEvents
          : { events: updatedEvents }
      },
      { revalidate: false, rollbackOnError: true }
    )

    // Perform the actual add
    const response = await fetch(`/api/calendar/events/${eventId}/attendees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to add attendee')
    }

    const data = await response.json()

    // Revalidate all calendar event caches to sync with server
    mutate((key) => typeof key === 'string' && key.startsWith('/api/calendar/events'))

    return data.event
  }

  const removeAttendee = async (eventId: string, email: string): Promise<CalendarEvent> => {
    // Optimistically remove the attendee from the event in the cache
    mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
      async (currentData: { events: CalendarEvent[] } | CalendarEvent[] | undefined) => {
        if (!currentData) return currentData

        // Handle both response formats
        const events = Array.isArray(currentData) ? currentData : currentData.events
        const updatedEvents = events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                attendees: (e.attendees || []).filter((a) => a.email !== email),
              }
            : e
        )

        return Array.isArray(currentData)
          ? updatedEvents
          : { events: updatedEvents }
      },
      { revalidate: false, rollbackOnError: true }
    )

    // Perform the actual remove
    const response = await fetch(`/api/calendar/events/${eventId}/attendees?email=${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to remove attendee')
    }

    const data = await response.json()

    // Revalidate all calendar event caches to sync with server
    mutate((key) => typeof key === 'string' && key.startsWith('/api/calendar/events'))

    return data.event
  }

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    addAttendee,
    removeAttendee,
  }
}
