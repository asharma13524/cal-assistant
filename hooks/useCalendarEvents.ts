'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { CalendarEvent } from '@/lib/types/calendar'

interface UseCalendarEventsOptions {
  timeMin?: Date
  timeMax?: Date
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.timeMin) {
        params.set('timeMin', options.timeMin.toISOString())
      }
      if (options.timeMax) {
        params.set('timeMax', options.timeMax.toISOString())
      }

      const response = await fetch(`/api/calendar/events?${params}`)
      const data = await response.json()

      if (!response.ok) {
        // If unauthorized, redirect to sign in
        if (response.status === 401) {
          console.log('[useCalendarEvents] Auth error, redirecting...')
          router.replace('/')
          return
        }
        throw new Error(data.error || 'Failed to fetch events')
      }

      setEvents(data.events || [])
    } catch (err) {
      console.error('[useCalendarEvents] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setIsLoading(false)
    }
  }, [options.timeMin?.getTime(), options.timeMax?.getTime(), router])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  return { events, isLoading, error, refetch: fetchEvents }
}
