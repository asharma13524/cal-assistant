'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChatWidget } from '@/components/chat/ChatWidget'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { SelectedDayPanel } from '@/components/calendar/SelectedDayPanel'
import { MonthView } from '@/components/calendar/views/MonthView'
import { WeekView } from '@/components/calendar/views/WeekView'
import { DayView } from '@/components/calendar/views/DayView'
import { YearView } from '@/components/calendar/views/YearView'
import { useAuth } from '@/hooks/useAuth'
import { useCalendarEventsSWR } from '@/hooks/useCalendarEventsSWR'
import type { CalendarEvent, ViewMode } from '@/lib/types/calendar'
import { getWeekStart, getWeekEnd, formatDateRange } from '@/lib/utils/calendar'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Calendar() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user, signOut } = useAuth()

  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('week') // Default to week view
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate())
  const [selectedDay, setSelectedDay] = useState<Date>(today)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)

  // Calculate date range for fetching events based on view mode
  const { timeMin, timeMax } = useMemo(() => {
    let result
    switch (viewMode) {
      case 'day':
        const dayStart = new Date(selectedDay)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(selectedDay)
        dayEnd.setHours(23, 59, 59, 999)
        result = { timeMin: dayStart, timeMax: dayEnd }
        break

      case 'week':
        const weekStart = getWeekStart(selectedDay)
        const weekEnd = getWeekEnd(selectedDay)
        result = { timeMin: weekStart, timeMax: weekEnd }
        break

      case 'month':
        const monthStart = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1)
        const monthEnd = new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 0, 23, 59, 59, 999)
        result = { timeMin: monthStart, timeMax: monthEnd }
        break

      case 'year':
        const yearStart = new Date(selectedDay.getFullYear(), 0, 1)
        const yearEnd = new Date(selectedDay.getFullYear(), 11, 31, 23, 59, 59, 999)
        result = { timeMin: yearStart, timeMax: yearEnd }
        break
    }

    return result
  }, [viewMode, selectedDay, currentMonth, currentYear])

  const { events, isLoading: eventsLoading, mutate: refreshEvents } = useCalendarEventsSWR({
    timeMin,
    timeMax,
  })

  // Group events by day for selected day panel
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, CalendarEvent[]> = {}

    // Use the selected day's month and year for filtering, not currentMonth/currentYear
    // This ensures the panel shows events for the actually selected day
    const targetMonth = selectedDay.getMonth()
    const targetYear = selectedDay.getFullYear()

    for (const event of events) {
      const dateString = event.start.dateTime || event.start.date || ''
      if (!dateString) continue

      const eventDate = new Date(dateString)

      if (
        eventDate.getMonth() === targetMonth &&
        eventDate.getFullYear() === targetYear
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
  }, [events, selectedDay])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, authLoading, router])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 't':
          goToToday()
          break
        case 'arrowleft':
          e.preventDefault()
          navigatePrevious()
          break
        case 'arrowright':
          e.preventDefault()
          navigateNext()
          break
        case 'd':
          setViewMode('day')
          break
        case 'w':
          setViewMode('week')
          break
        case 'm':
          setViewMode('month')
          break
        case 'y':
          setViewMode('year')
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [viewMode, selectedDay, currentMonth, currentYear])

  // Responsive: auto-switch Week to Day on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && viewMode === 'week') {
        setViewMode('day')
      }
    }

    handleResize() // Check on mount
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        const prevDay = new Date(selectedDay)
        prevDay.setDate(selectedDay.getDate() - 1)
        setSelectedDay(prevDay)
        setCurrentMonth(prevDay.getMonth())
        setCurrentYear(prevDay.getFullYear())
        setSelectedDate(prevDay.getDate())
        break
      case 'week':
        const prevWeek = new Date(selectedDay)
        prevWeek.setDate(selectedDay.getDate() - 7)
        setSelectedDay(prevWeek)
        setCurrentMonth(prevWeek.getMonth())
        setCurrentYear(prevWeek.getFullYear())
        break
      case 'month':
        if (currentMonth === 0) {
          setCurrentMonth(11)
          setCurrentYear(currentYear - 1)
        } else {
          setCurrentMonth(currentMonth - 1)
        }
        setSelectedDate(null)
        break
      case 'year':
        setCurrentYear(currentYear - 1)
        break
    }
  }

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        const nextDay = new Date(selectedDay)
        nextDay.setDate(selectedDay.getDate() + 1)
        setSelectedDay(nextDay)
        setCurrentMonth(nextDay.getMonth())
        setCurrentYear(nextDay.getFullYear())
        setSelectedDate(nextDay.getDate())
        break
      case 'week':
        const nextWeek = new Date(selectedDay)
        nextWeek.setDate(selectedDay.getDate() + 7)
        setSelectedDay(nextWeek)
        setCurrentMonth(nextWeek.getMonth())
        setCurrentYear(nextWeek.getFullYear())
        break
      case 'month':
        if (currentMonth === 11) {
          setCurrentMonth(0)
          setCurrentYear(currentYear + 1)
        } else {
          setCurrentMonth(currentMonth + 1)
        }
        setSelectedDate(null)
        break
      case 'year':
        setCurrentYear(currentYear + 1)
        break
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(today.getDate())
    setSelectedDay(today)
  }

  const handleDateClick = (day: number) => {
    setSelectedDate(day)
    const newDate = new Date(currentYear, currentMonth, day)
    setSelectedDay(newDate)
  }

  const handleMonthClick = (month: number) => {
    setCurrentMonth(month)
    setViewMode('month')
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    setSelectedDate(date.getDate())
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
  }

  const getCurrentPeriod = () => {
    switch (viewMode) {
      case 'day':
        return `${MONTHS[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`
      case 'week':
        const weekStart = getWeekStart(selectedDay)
        const weekEnd = getWeekEnd(selectedDay)
        return formatDateRange(weekStart, weekEnd)
      case 'month':
        return `${MONTHS[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`
      case 'year':
        return `${selectedDay.getFullYear()}`
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CalendarHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          currentPeriod={getCurrentPeriod()}
          onNavigate={(dir) => dir === 'prev' ? navigatePrevious() : navigateNext()}
          onToday={goToToday}
          onRefresh={() => refreshEvents()}
          isLoading={eventsLoading}
        />

        <div className={`grid grid-cols-1 ${isPanelCollapsed ? 'lg:grid-cols-[1fr,auto]' : 'lg:grid-cols-3'} gap-6 transition-all duration-300`}>
          {/* Calendar View */}
          <div className={isPanelCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'}>
            <div className="transition-opacity duration-200">
              {viewMode === 'month' && (
                <MonthView
                  currentMonth={selectedDay.getMonth()}
                  currentYear={selectedDay.getFullYear()}
                  events={events}
                  selectedDate={selectedDate}
                  onDateClick={handleDateClick}
                />
              )}
              {viewMode === 'week' && (
                <WeekView
                  weekStart={getWeekStart(selectedDay)}
                  events={events}
                  onEventClick={handleEventClick}
                  onDayClick={handleDayClick}
                />
              )}
              {viewMode === 'day' && (
                <DayView
                  selectedDay={selectedDay}
                  events={events}
                  onEventClick={handleEventClick}
                />
              )}
              {viewMode === 'year' && (
                <YearView
                  currentYear={selectedDay.getFullYear()}
                  events={events}
                  onMonthClick={handleMonthClick}
                />
              )}
            </div>
          </div>

          {/* Selected Date Panel */}
          <SelectedDayPanel
            selectedDate={
              selectedDate
                ? { month: MONTHS[selectedDay.getMonth()], day: selectedDate }
                : null
            }
            events={selectedEvents}
            onEventClick={handleEventClick}
            isCollapsed={isPanelCollapsed}
            onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
          />
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
