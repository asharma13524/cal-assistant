import * as chrono from 'chrono-node'
import { USER_TIMEZONE } from '@/lib/constants'
import { addDaysInUserTimezone } from '@/lib/utils/timezone'

/**
 * Get the day name for a date in the user's timezone
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: USER_TIMEZONE })
}

/**
 * Format a date as YYYY-MM-DD in the user's timezone
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: USER_TIMEZONE })
}

/**
 * Get the day of week number (0=Sunday, 6=Saturday) in the user's timezone
 */
function getDayOfWeek(date: Date): number {
  const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: USER_TIMEZONE })
  const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
  return dayMap[dayStr] || 0
}

/**
 * Format a business week (Mon-Fri) as a list of dates
 */
function formatBusinessWeek(startMonday: Date): string {
  const dates = []
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  for (let i = 0; i < 5; i++) {
    const date = addDaysInUserTimezone(startMonday, i)
    dates.push(`${dayNames[i]} = ${formatDate(date)}`)
  }
  return dates.join('\n')
}

/**
 * Get date information from a natural language query.
 * Handles queries like "next week", "tomorrow", "next Monday", etc.
 * Returns formatted date information for use by Claude.
 */
export function getDateInfo(query: string): string {
  const queryLower = query.toLowerCase()
  const now = new Date()

  // Special handling for "this week" / "upcoming week" / "coming week"
  if (queryLower.match(/\b(this|upcoming|coming)\s+week\b/)) {
    const currentDay = getDayOfWeek(now)
    let monday: Date

    if (currentDay === 0) {
      monday = addDaysInUserTimezone(now, 1)
    } else if (currentDay === 6) {
      monday = addDaysInUserTimezone(now, 2)
    } else {
      const daysSinceMonday = currentDay - 1
      monday = addDaysInUserTimezone(now, -daysSinceMonday)
    }

    const friday = addDaysInUserTimezone(monday, 4)

    return `This week (business days):
${formatBusinessWeek(monday)}

⚠️ TO GET CALENDAR EVENTS FOR THIS WEEK, USE THESE EXACT DATES:
start_date: "${formatDate(monday)}"
end_date: "${formatDate(friday)}"`
  }

  // Special handling for "next week"
  if (queryLower.match(/\bnext\s+week\b/)) {
    const currentDay = getDayOfWeek(now)
    const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay
    const nextMonday = addDaysInUserTimezone(now, daysUntilNextMonday)
    const nextFriday = addDaysInUserTimezone(nextMonday, 4)

    return `Next week (business days):
${formatBusinessWeek(nextMonday)}

⚠️ TO GET CALENDAR EVENTS FOR NEXT WEEK, USE THESE EXACT DATES:
start_date: "${formatDate(nextMonday)}"
end_date: "${formatDate(nextFriday)}"`
  }

  // For everything else, use chrono for natural language parsing
  const parsed = chrono.parse(query, now)

  if (parsed.length > 0) {
    const result = parsed[0]
    const startDate = result.start.date()

    // Check if it's a range
    if (result.end) {
      const endDate = result.end.date()
      return `Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`
    }

    // Single date
    const dayName = getDayName(startDate)
    const isoDate = formatDate(startDate)
    return `${isoDate} is a ${dayName}

To use this date in calendar operations, use: "${isoDate}"`
  }

  // Fallback to current date
  return `Current date: ${getDayName(now)}, ${formatDate(now)}`
}
