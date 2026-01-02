'use client'

import { useEffect, useRef, useMemo } from 'react'
import type { CalendarEvent, CalendarEventWithColumn } from '@/lib/types/calendar'
import { EventBlock } from '../shared/EventBlock'
import { CurrentTimeIndicator } from '../shared/CurrentTimeIndicator'
import {
  isSameDay,
  isToday,
  groupOverlappingEvents,
  calculateEventPosition,
  getHourHeight,
} from '@/lib/utils/calendar'

interface DayViewProps {
  selectedDay: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const START_HOUR = 0  // Midnight
const END_HOUR = 23   // 11 PM - full 24 hour day
const HOUR_HEIGHT = getHourHeight()
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function DayView({ selectedDay, events, onEventClick }: DayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter events for selected day
  const dayEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const eventStart = new Date(event.start.dateTime || event.start.date || '')
      return isSameDay(eventStart, selectedDay)
    })

    // Sort by start time
    filtered.sort((a, b) => {
      const aTime = new Date(a.start.dateTime || a.start.date || '').getTime()
      const bTime = new Date(b.start.dateTime || b.start.date || '').getTime()
      return aTime - bTime
    })

    // Apply overlap detection
    groupOverlappingEvents(filtered)

    return filtered
  }, [selectedDay, events])

  // Scroll to current time on mount if viewing today
  useEffect(() => {
    if (isToday(selectedDay) && containerRef.current) {
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        const scrollPosition = (currentHour - START_HOUR) * HOUR_HEIGHT - 100
        containerRef.current.scrollTop = Math.max(0, scrollPosition)
      }
    }
  }, [selectedDay])

  const dayIsToday = isToday(selectedDay)
  const dayName = WEEKDAYS[selectedDay.getDay()]
  const month = selectedDay.toLocaleDateString('en-US', { month: 'short' })

  return (
    <div className="bg-white dark:bg-stone-800/50 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-y-auto max-h-[calc(100vh-200px)]"
      >
        {/* Day header - inside scroll container */}
        <div className="sticky top-0 z-20 bg-white dark:bg-stone-800/95 border-b border-stone-200 dark:border-stone-800">
          <div className="flex">
            {/* Time column spacer */}
            <div className="w-16 flex-shrink-0 border-r border-stone-200 dark:border-stone-800" />

            {/* Day header */}
            <div className="flex-1 p-4 text-center">
              <div className="text-sm font-medium text-stone-500 dark:text-stone-500">{dayName}</div>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div
                  className={`text-2xl font-semibold ${
                    dayIsToday
                      ? 'w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-400 dark:to-primary-500 text-white'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {selectedDay.getDate()}
                </div>
                {!dayIsToday && (
                  <div className="text-lg font-medium text-stone-500 dark:text-stone-500">{month}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pt-3">
        {/* Container with exact height + extra padding for first time label */}
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Content layer */}
          <div className="relative flex h-full">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0 relative border-r border-stone-200 dark:border-stone-800">
              {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => {
                const hour = START_HOUR + i
                const period = hour >= 12 ? 'PM' : 'AM'
                const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
                const time = `${displayHour} ${period}`

                return (
                  <div
                    key={hour}
                    className="absolute w-full pr-2"
                    style={{
                      top: `${i * HOUR_HEIGHT}px`,
                      height: `${HOUR_HEIGHT}px`
                    }}
                  >
                    <span className="text-xs text-stone-500 dark:text-stone-500 absolute right-2 -top-2.5">
                      {time}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Day column with events */}
            <div className="flex-1 relative">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none z-0">
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-stone-200 dark:bg-stone-700/50"
                    style={{ top: `${(i + 1) * HOUR_HEIGHT}px` }}
                  />
                ))}
              </div>

              {/* Events */}
              {dayEvents.map((event) => {
                const eventWithCol = event as CalendarEventWithColumn
                const position = calculateEventPosition(
                  event,
                  START_HOUR,
                  HOUR_HEIGHT,
                  eventWithCol.column || 0,
                  eventWithCol.totalColumns || 1
                )

                return (
                  <EventBlock
                    key={event.id}
                    event={event}
                    position={position}
                    onClick={() => onEventClick(event)}
                  />
                )
              })}

              {/* Current time indicator */}
              {dayIsToday && (
                <CurrentTimeIndicator startHour={START_HOUR} hourHeight={HOUR_HEIGHT} leftOffset={0} />
              )}

              {/* Empty state */}
              {dayEvents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-stone-400 dark:text-stone-600 mt-20">
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No events today</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
