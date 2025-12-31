import { useMemo } from 'react'
import type { CalendarEvent } from '@/lib/types/calendar'
import { getMonthGrid, isToday as checkIsToday } from '@/lib/utils/calendar'

interface MonthViewProps {
  currentMonth: number
  currentYear: number
  events: CalendarEvent[]
  selectedDate: number | null
  onDateClick: (day: number) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function MonthView({
  currentMonth,
  currentYear,
  events,
  selectedDate,
  onDateClick,
}: MonthViewProps) {
  const days = useMemo(() => getMonthGrid(currentYear, currentMonth), [currentYear, currentMonth])

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {}

    for (const event of events) {
      const dateString = event.start.dateTime || event.start.date || ''
      if (!dateString) continue

      const eventDate = new Date(dateString)
      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        const day = eventDate.getDate()
        if (!grouped[day]) {
          grouped[day] = []
        }
        grouped[day].push(event)
      }
    }

    // Sort events by start time within each day
    for (const day in grouped) {
      grouped[day].sort((a, b) => {
        const aTime = a.start.dateTime || a.start.date || ''
        const bTime = b.start.dateTime || b.start.date || ''
        return new Date(aTime).getTime() - new Date(bTime).getTime()
      })
    }

    return grouped
  }, [events, currentMonth, currentYear])

  const isToday = (day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const hasEvents = day ? (eventsByDay[day]?.length || 0) > 0 : false
          const eventCount = day ? eventsByDay[day]?.length || 0 : 0

          return (
            <button
              key={index}
              onClick={() => day && onDateClick(day)}
              disabled={!day}
              className={`aspect-square flex flex-col items-center justify-center text-sm transition-all relative p-1 ${
                !day
                  ? 'cursor-default'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50 cursor-pointer'
              } ${
                day === selectedDate
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white font-semibold'
                  : ''
              } ${
                isToday(day as number) && day !== selectedDate
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span>{day}</span>
              {hasEvents && day !== selectedDate && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full ${
                        isToday(day as number)
                          ? 'bg-blue-600 dark:bg-blue-400'
                          : 'bg-zinc-400 dark:bg-zinc-500'
                      }`}
                    />
                  ))}
                </div>
              )}
              {hasEvents && day === selectedDate && (
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white/70" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
