'use client'

import { useEffect, useRef, useMemo } from 'react'
import type { CalendarEvent } from '@/lib/types/calendar'
import { TimelineGrid } from '../shared/TimelineGrid'
import { EventBlock } from '../shared/EventBlock'
import { CurrentTimeIndicator } from '../shared/CurrentTimeIndicator'
import {
  getWeekDays,
  isSameDay,
  isToday,
  groupOverlappingEvents,
  calculateEventPosition,
  getHourHeight,
} from '@/lib/utils/calendar'

interface WeekViewProps {
  weekStart: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDayClick?: (date: Date) => void
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const START_HOUR = 6
const END_HOUR = 22
const HOUR_HEIGHT = getHourHeight()

export function WeekView({ weekStart, events, onEventClick, onDayClick }: WeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {}

    weekDays.forEach((day) => {
      const dayKey = day.toDateString()
      grouped[dayKey] = events.filter((event) => {
        const eventStart = new Date(event.start.dateTime || event.start.date || '')
        return isSameDay(eventStart, day)
      })

      // Sort events by start time
      grouped[dayKey].sort((a, b) => {
        const aTime = new Date(a.start.dateTime || a.start.date || '').getTime()
        const bTime = new Date(b.start.dateTime || b.start.date || '').getTime()
        return aTime - bTime
      })

      // Apply overlap detection
      groupOverlappingEvents(grouped[dayKey])
    })

    return grouped
  }, [weekDays, events])

  // Scroll to current time on mount if viewing this week
  useEffect(() => {
    const now = new Date()
    const isThisWeek = weekDays.some((day) => isSameDay(day, now))

    if (isThisWeek && containerRef.current) {
      const currentHour = now.getHours()
      if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
        const scrollPosition = (currentHour - START_HOUR) * HOUR_HEIGHT - 100
        containerRef.current.scrollTop = Math.max(0, scrollPosition)
      }
    }
  }, [weekDays])

  return (
    <div
      ref={containerRef}
      className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
    >
      {/* Day headers */}
      <div className="sticky top-0 z-20 bg-white dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex">
          {/* Time column spacer */}
          <div className="w-16 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800" />

          {/* Day headers */}
          {weekDays.map((day, index) => {
            const dayIsToday = isToday(day)
            return (
              <button
                key={index}
                onClick={() => onDayClick?.(day)}
                className="flex-1 p-3 text-center border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
              >
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                  {WEEKDAYS[day.getDay()].slice(0, 3)}
                </div>
                <div
                  className={`text-lg font-semibold mt-1 ${
                    dayIsToday
                      ? 'w-8 h-8 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {day.getDate()}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative overflow-y-auto max-h-[calc(100vh-300px)]">
        {/* Container with exact height */}
        <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Grid lines background - single source of truth */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-px bg-zinc-200 dark:bg-zinc-800"
                style={{ top: `${(i + 1) * HOUR_HEIGHT}px` }}
              />
            ))}
          </div>

          {/* Content layer */}
          <div className="relative flex h-full">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0 relative border-r border-zinc-200 dark:border-zinc-800">
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
                    <span className="text-xs text-zinc-500 dark:text-zinc-500 absolute right-2 -top-2.5">
                      {time}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Day columns */}
            <div className="flex-1 flex relative">
              {weekDays.map((day, dayIndex) => {
                const dayKey = day.toDateString()
                const dayEvents = eventsByDay[dayKey] || []

                return (
                  <div
                    key={dayIndex}
                    className="flex-1 relative border-r border-zinc-200 dark:border-zinc-800 last:border-r-0"
                  >
                    {/* Events */}
                    {dayEvents.map((event) => {
                      const eventWithCol = event as any
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
                    {isToday(day) && (
                      <CurrentTimeIndicator startHour={START_HOUR} hourHeight={HOUR_HEIGHT} leftOffset={0} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
