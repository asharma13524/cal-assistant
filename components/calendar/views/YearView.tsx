import { useMemo } from 'react'
import type { CalendarEvent } from '@/lib/types/calendar'
import { getMonthsInYear, getMonthGrid, isSameDay } from '@/lib/utils/calendar'

interface YearViewProps {
  currentYear: number
  events: CalendarEvent[]
  onMonthClick: (month: number) => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function YearView({ currentYear, events, onMonthClick }: YearViewProps) {
  const months = useMemo(() => getMonthsInYear(currentYear), [currentYear])

  // Count events per day
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, number> = {}

    events.forEach((event) => {
      const dateString = event.start.dateTime || event.start.date || ''
      if (!dateString) return

      const eventDate = new Date(dateString)
      if (eventDate.getFullYear() === currentYear) {
        const key = eventDate.toDateString()
        grouped[key] = (grouped[key] || 0) + 1
      }
    })

    return grouped
  }, [events, currentYear])

  const getEventCount = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day)
    const key = date.toDateString()
    return eventsByDate[key] || 0
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
      {/* Year grid - 4 columns on desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((month, monthIndex) => {
          const days = getMonthGrid(currentYear, monthIndex)

          return (
            <button
              key={monthIndex}
              onClick={() => onMonthClick(monthIndex)}
              className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-left"
            >
              {/* Month name */}
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">
                {MONTHS[monthIndex]}
              </h3>

              {/* Mini calendar */}
              <div className="space-y-0.5">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-0.5">
                  {WEEKDAYS_SHORT.map((day, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 text-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map((day, dayIndex) => {
                    const eventCount = day ? getEventCount(currentYear, monthIndex, day) : 0
                    const hasEvents = eventCount > 0
                    const dayIsToday = day ? isToday(currentYear, monthIndex, day) : false

                    return (
                      <div
                        key={dayIndex}
                        className={`aspect-square flex items-center justify-center text-[10px] relative ${
                          day
                            ? dayIsToday
                              ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-full font-semibold'
                              : 'text-zinc-700 dark:text-zinc-300'
                            : ''
                        }`}
                      >
                        {day && (
                          <>
                            <span>{day}</span>
                            {hasEvents && !dayIsToday && (
                              <div className="absolute bottom-0 w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400" />
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Event count summary */}
              <div className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
                {(() => {
                  const monthEventCount = days.reduce((count: number, day) => {
                    if (!day) return count
                    return count + getEventCount(currentYear, monthIndex, day)
                  }, 0)

                  if (monthEventCount === 0) return 'No events'
                  if (monthEventCount === 1) return '1 event'
                  return `${monthEventCount} events`
                })()}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
