'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import type { CalendarEvent } from '@/lib/types/calendar'

interface UseCalendarEventsSWROptions {
  timeMin?: Date
  timeMax?: Date
}

const fetcher = async (url: string): Promise<CalendarEvent[]> => {
  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED')
    }
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to fetch events')
  }

  const data = await response.json()
  return data.events as CalendarEvent[]
}

export function useCalendarEventsSWR(options: UseCalendarEventsSWROptions = {}) {
  const router = useRouter()

  const params = new URLSearchParams()
  if (options.timeMin) params.set('timeMin', options.timeMin.toISOString())
  if (options.timeMax) params.set('timeMax', options.timeMax.toISOString())

  const queryString = params.toString()
  const url = `/api/calendar/events${queryString ? `?${queryString}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<CalendarEvent[]>(
    url,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5000, // Auto-refresh every 5 seconds as fallback (optimistic updates should make this rarely needed)
      onError: (err) => {
        if (err.message === 'UNAUTHORIZED') {
          router.replace('/')
        }
      },
    }
  )

  return {
    events: data || [],
    isLoading,
    error: error?.message || null,
    mutate,
  }
}
