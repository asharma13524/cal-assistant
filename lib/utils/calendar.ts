import type { CalendarEvent } from '../types/calendar'

// Week calculations
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + i)
    days.push(day)
  }
  return days
}

// Time slot generation for timeline views
export function getTimeSlots(startHour = 6, endHour = 22): string[] {
  const slots: string[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    slots.push(`${displayHour} ${period}`)
  }
  return slots
}

export function getHourHeight(): number {
  return 60 // 60px per hour
}

// Event positioning for timeline views
export interface EventPosition {
  top: number       // Pixels from top
  height: number    // Height in pixels
  left: string      // Percentage from left
  width: string     // Width percentage
  zIndex: number    // Stacking order
}

export function calculateEventPosition(
  event: CalendarEvent,
  startHour: number,
  hourHeight: number,
  column = 0,
  totalColumns = 1
): EventPosition {
  const startTime = new Date(event.start.dateTime || event.start.date || '')
  const endTime = new Date(event.end.dateTime || event.end.date || '')

  // Calculate hours from start of day
  const startHours = startTime.getHours() + startTime.getMinutes() / 60
  const endHours = endTime.getHours() + endTime.getMinutes() / 60

  // Calculate position from startHour
  const top = (startHours - startHour) * hourHeight
  const height = Math.max((endHours - startHours) * hourHeight, hourHeight * 0.5) // Minimum 30min height

  // Calculate horizontal position for overlapping events
  const width = `${(100 / totalColumns)}%`
  const left = `${(column / totalColumns) * 100}%`

  return {
    top,
    height,
    left,
    width,
    zIndex: column
  }
}

// Detect overlapping events
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.start.dateTime || event1.start.date || '').getTime()
  const end1 = new Date(event1.end.dateTime || event1.end.date || '').getTime()
  const start2 = new Date(event2.start.dateTime || event2.start.date || '').getTime()
  const end2 = new Date(event2.end.dateTime || event2.end.date || '').getTime()

  return start1 < end2 && start2 < end1
}

export interface EventWithColumn extends CalendarEvent {
  column?: number
  totalColumns?: number
}

export function groupOverlappingEvents(events: CalendarEvent[]): EventWithColumn[][] {
  if (events.length === 0) return []

  // Sort events by start time
  const sorted = [...events].sort((a, b) => {
    const aTime = new Date(a.start.dateTime || a.start.date || '').getTime()
    const bTime = new Date(b.start.dateTime || b.start.date || '').getTime()
    return aTime - bTime
  })

  const groups: EventWithColumn[][] = []
  let currentGroup: EventWithColumn[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const event = sorted[i]
    const overlapsWithGroup = currentGroup.some(groupEvent => eventsOverlap(event, groupEvent))

    if (overlapsWithGroup) {
      currentGroup.push(event)
    } else {
      groups.push(currentGroup)
      currentGroup = [event]
    }
  }
  groups.push(currentGroup)

  // Assign columns to each group
  groups.forEach(group => {
    const columns: EventWithColumn[][] = []

    group.forEach(event => {
      // Find first column where event doesn't overlap
      let placed = false
      for (let col = 0; col < columns.length; col++) {
        const overlapsInColumn = columns[col].some(colEvent => eventsOverlap(event, colEvent))
        if (!overlapsInColumn) {
          columns[col].push(event)
          event.column = col
          placed = true
          break
        }
      }

      // Create new column if needed
      if (!placed) {
        columns.push([event])
        event.column = columns.length - 1
      }
    })

    // Set total columns for width calculation
    const totalColumns = columns.length
    group.forEach(event => {
      event.totalColumns = totalColumns
    })
  })

  return groups
}

// Year view helpers
export function getMonthsInYear(year: number): Date[] {
  const months: Date[] = []
  for (let i = 0; i < 12; i++) {
    months.push(new Date(year, i, 1))
  }
  return months
}

export function getMonthGrid(year: number, month: number): (number | null)[] {
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

// Current time calculations
export function getCurrentTimePosition(startHour: number, hourHeight: number): number {
  const now = new Date()
  const hours = now.getHours() + now.getMinutes() / 60
  return (hours - startHour) * hourHeight
}

export function isCurrentTimeVisible(startHour: number, endHour: number): boolean {
  const now = new Date()
  const hour = now.getHours()
  return hour >= startHour && hour <= endHour
}

// Event coloring system
export const EVENT_COLORS = [
  { bg: 'bg-blue-500', bgDark: 'dark:bg-blue-600', border: 'border-blue-600', borderDark: 'dark:border-blue-400', text: 'text-white', light: 'bg-blue-50', lightDark: 'dark:bg-blue-900/20' },
  { bg: 'bg-green-500', bgDark: 'dark:bg-green-600', border: 'border-green-600', borderDark: 'dark:border-green-400', text: 'text-white', light: 'bg-green-50', lightDark: 'dark:bg-green-900/20' },
  { bg: 'bg-purple-500', bgDark: 'dark:bg-purple-600', border: 'border-purple-600', borderDark: 'dark:border-purple-400', text: 'text-white', light: 'bg-purple-50', lightDark: 'dark:bg-purple-900/20' },
  { bg: 'bg-orange-500', bgDark: 'dark:bg-orange-600', border: 'border-orange-600', borderDark: 'dark:border-orange-400', text: 'text-white', light: 'bg-orange-50', lightDark: 'dark:bg-orange-900/20' },
  { bg: 'bg-pink-500', bgDark: 'dark:bg-pink-600', border: 'border-pink-600', borderDark: 'dark:border-pink-400', text: 'text-white', light: 'bg-pink-50', lightDark: 'dark:bg-pink-900/20' },
  { bg: 'bg-teal-500', bgDark: 'dark:bg-teal-600', border: 'border-teal-600', borderDark: 'dark:border-teal-400', text: 'text-white', light: 'bg-teal-50', lightDark: 'dark:bg-teal-900/20' },
]

export function getEventColor(calendarId?: string): typeof EVENT_COLORS[0] {
  if (!calendarId) return EVENT_COLORS[0]

  // Simple hash function for consistent colors
  let hash = 0
  for (let i = 0; i < calendarId.length; i++) {
    hash = ((hash << 5) - hash) + calendarId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }

  const index = Math.abs(hash) % EVENT_COLORS.length
  return EVENT_COLORS[index]
}

// Date formatting helpers
export function formatDateRange(start: Date, end: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${months[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`
  } else if (start.getFullYear() === end.getFullYear()) {
    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`
  } else {
    return `${months[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} - ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  }
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

// Get initials from name for avatars
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Generate avatar color based on email
export function getAvatarColor(email: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-teal-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
  ]

  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i)
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}
