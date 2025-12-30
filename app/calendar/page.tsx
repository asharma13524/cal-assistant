'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { useAuth } from '@/hooks/useAuth'
import { useCalendarEventsSWR } from '@/hooks/useCalendarEventsSWR'
import type { CalendarEvent } from '@/lib/types/calendar'

// Generate calendar days for current month
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const days: (number | null)[] = []

  for (let i = 0; i < startingDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return days
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTime(dateString: string | undefined) {
  if (!dateString) return 'All day'
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const startTime = formatTime(event.start.dateTime)
  const endTime = formatTime(event.end.dateTime)

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded-r-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-zinc-900 dark:text-white truncate">
            {event.summary}
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {startTime} – {endTime}
          </p>
          {event.location && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              📍 {event.location}
            </p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              👥 {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}

export default function Calendar() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user, signOut } = useAuth()

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate())
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const days = getCalendarDays(currentYear, currentMonth)

  // Calculate date range for fetching events (current month view)
  const timeMin = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1)
    return date
  }, [currentYear, currentMonth])

  const timeMax = useMemo(() => {
    const date = new Date(currentYear, currentMonth + 1, 0)
    date.setHours(23, 59, 59, 999)
    return date
  }, [currentYear, currentMonth])

  const { events, isLoading: eventsLoading } = useCalendarEventsSWR({
    timeMin,
    timeMax,
  })

  // Group events by day
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {}

    for (const event of events) {
      const dateString = event.start.dateTime || event.start.date || ''
      if (!dateString) continue

      const eventDate = new Date(dateString)
      if (
        eventDate.getMonth() === currentMonth &&
        eventDate.getFullYear() === currentYear
      ) {
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

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, authLoading, router])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(today.getDate())
  }

  const isToday = (day: number) => {
    return day === today.getDate() &&
           currentMonth === today.getMonth() &&
           currentYear === today.getFullYear()
  }

  const selectedEvents = selectedDate ? eventsByDay[selectedDate] || [] : []

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-lg">Calendar</span>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 hidden sm:inline">
                    {user.email}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <button
                onClick={signOut}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Controls */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">
              {MONTHS[currentMonth]} {currentYear}
            </h1>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Today
            </button>
            {eventsLoading && (
              <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500 rounded-full animate-spin" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="py-3 text-center text-sm font-medium text-zinc-500 dark:text-zinc-500">
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
                      onClick={() => day && setSelectedDate(day)}
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
          </div>

          {/* Selected Date Events */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 sticky top-6">
              <h2 className="font-semibold mb-4">
                {selectedDate ? (
                  <>
                    {MONTHS[currentMonth]} {selectedDate}
                    <span className="font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                      {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  'Select a date'
                )}
              </h2>

              {selectedDate ? (
                selectedEvents.length > 0 ? (
                  <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {selectedEvents.map((event) => (
                      <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500 dark:text-zinc-500">
                    <svg className="w-8 h-8 mb-2 text-zinc-400 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">No events</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
                      Use the chat to schedule something
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Click on a date to view events
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
