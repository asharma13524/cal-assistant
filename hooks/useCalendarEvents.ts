'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { CalendarEvent } from '@/lib/types/calendar'

interface UseCalendarEventsOptions {
  timeMin?: Date
  timeMax?: Date
}

interface CalendarEventsResponse {
  events: CalendarEvent[]
  error?: string
}

async function fetcher(url: string): Promise<CalendarEventsResponse> {
  const response = await fetch(url)
  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to fetch events') as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return data
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const router = useRouter()

  // Build the API URL with query params
  const params = new URLSearchParams()
  if (options.timeMin) {
    params.set('timeMin', options.timeMin.toISOString())
  }
  if (options.timeMax) {
    params.set('timeMax', options.timeMax.toISOString())
  }
  const url = `/api/calendar/events?${params}`

  const { data, error, isLoading, mutate } = useSWR<CalendarEventsResponse, Error & { status?: number }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  )

  // Handle auth errors by redirecting
  useEffect(() => {
    if (error?.status === 401) {
      console.log('[useCalendarEvents] Auth error, redirecting...')
      router.replace('/')
    }
  }, [error, router])

  return {
    events: data?.events || [],
    isLoading,
    error: error?.message || null,
    refetch: mutate,
  }
}
