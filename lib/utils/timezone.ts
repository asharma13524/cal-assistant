import { format, parse } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { USER_TIMEZONE } from '@/lib/constants'

/**
 * Parse an ISO datetime string as if it's in the user's timezone.
 * Returns a proper Date object (UTC internally).
 * 
 * Example: parseInUserTimezone("2025-12-31T17:00:00") 
 *          → Date representing 5 PM EST (which is 10 PM UTC)
 */
export function parseInUserTimezone(isoDateStr: string): Date {
  // fromZonedTime interprets the date string as being in the specified timezone
  // and returns the equivalent UTC Date
  return fromZonedTime(isoDateStr, USER_TIMEZONE)
}

/**
 * Get the current time as a Date in the user's timezone context.
 * (Still a UTC Date internally, but represents "now" correctly for comparison)
 */
export function nowInUserTimezone(): Date {
  return new Date()
}

/**
 * Format a Date for display in the user's timezone.
 */
export function formatTimeInUserTimezone(date: Date): string {
  const zonedDate = toZonedTime(date, USER_TIMEZONE)
  return format(zonedDate, 'h:mm a') // e.g., "5:00 PM"
}

/**
 * Format a Date for display in the user's timezone (date only).
 */
export function formatDateInUserTimezone(date: Date): string {
  const zonedDate = toZonedTime(date, USER_TIMEZONE)
  return format(zonedDate, 'M/d/yyyy') // e.g., "12/31/2025"
}

/**
 * Format a Date for display in the user's timezone (full datetime).
 */
export function formatDateTimeInUserTimezone(date: Date): string {
  const zonedDate = toZonedTime(date, USER_TIMEZONE)
  return format(zonedDate, 'M/d/yyyy, h:mm a') // e.g., "12/31/2025, 5:00 PM"
}

/**
 * Check if a given ISO datetime string (in user's timezone) is in the past.
 */
export function isTimeInPast(isoDateStr: string): boolean {
  const eventTime = parseInUserTimezone(isoDateStr)
  const now = new Date()
  return eventTime < now
}

