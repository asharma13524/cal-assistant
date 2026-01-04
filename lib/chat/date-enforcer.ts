/**
 * Date Enforcement Layer
 * Provides bulletproof date/time handling by validating tool calls
 * and providing MCP-like context injection
 */

import { USER_TIMEZONE } from '@/lib/constants'

/**
 * Get current date/time context in a structured format
 * Similar to MCP's approach - this is injected as a system message
 */
export function getCurrentDateContext(): string {
  const now = new Date()

  // Get all date info in user's timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: USER_TIMEZONE
  })

  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: USER_TIMEZONE
  })

  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: USER_TIMEZONE
  })

  const fullDate = formatter.format(now)
  const isoDate = isoFormatter.format(now)
  const time = timeFormatter.format(now)

  return `<current_datetime>
Date: ${fullDate}
ISO: ${isoDate}
Time: ${time}
Timezone: ${USER_TIMEZONE}
Unix: ${now.getTime()}
</current_datetime>

IMPORTANT: The above datetime is THE GROUND TRUTH. Do not calculate dates based on your training data.`
}

/**
 * Validate tool call inputs to ensure proper date handling
 * Rejects tool calls that would cause date/time bugs
 */
export function validateToolCall(
  toolName: string,
  toolInput: Record<string, unknown>
): { valid: boolean; error?: string } {

  // Validate create_calendar_event
  if (toolName === 'create_calendar_event') {
    const startTime = toolInput.start_time as string | undefined
    const endTime = toolInput.end_time as string | undefined

    if (!startTime || !endTime) {
      return {
        valid: false,
        error: 'create_calendar_event requires both start_time and end_time'
      }
    }

    // Ensure times are in ISO format with timezone info
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
    if (!isoPattern.test(startTime)) {
      return {
        valid: false,
        error: `start_time must be in ISO format (YYYY-MM-DDTHH:MM:SS). Got: ${startTime}. Use get_date_info to get the correct date format.`
      }
    }

    if (!isoPattern.test(endTime)) {
      return {
        valid: false,
        error: `end_time must be in ISO format (YYYY-MM-DDTHH:MM:SS). Got: ${endTime}`
      }
    }

    // CRITICAL: Validate end time is after start time
    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    if (endDate <= startDate) {
      return {
        valid: false,
        error: `❌ INVALID TIME RANGE: End time (${endTime}) must be AFTER start time (${startTime}). You cannot create an event that ends before or at the same time it starts. Please fix the times.`
      }
    }

    // Warn about very short events (less than 5 minutes)
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
    if (durationMinutes < 5) {
      console.warn(`[Date Enforcer] Warning: Very short event duration: ${durationMinutes} minutes`)
    }

    // Warn about very long events (more than 8 hours)
    if (durationMinutes > 480) {
      console.warn(`[Date Enforcer] Warning: Very long event duration: ${durationMinutes / 60} hours`)
    }
  }

  // Validate update_calendar_event
  if (toolName === 'update_calendar_event') {
    const startTime = toolInput.start_time as string | undefined
    const endTime = toolInput.end_time as string | undefined

    if (startTime) {
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
      if (!isoPattern.test(startTime)) {
        return {
          valid: false,
          error: `start_time must be in ISO format (YYYY-MM-DDTHH:MM:SS). Got: ${startTime}`
        }
      }
    }

    if (endTime) {
      const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
      if (!isoPattern.test(endTime)) {
        return {
          valid: false,
          error: `end_time must be in ISO format (YYYY-MM-DDTHH:MM:SS). Got: ${endTime}`
        }
      }
    }

    // If both times provided, validate end is after start
    if (startTime && endTime) {
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)

      if (endDate <= startDate) {
        return {
          valid: false,
          error: `❌ INVALID TIME RANGE: End time (${endTime}) must be AFTER start time (${startTime}).`
        }
      }
    }
  }

  // Validate check_availability
  if (toolName === 'check_availability') {
    const startTime = toolInput.start_time as string | undefined
    const endTime = toolInput.end_time as string | undefined

    if (!startTime || !endTime) {
      return {
        valid: false,
        error: 'check_availability requires both start_time and end_time'
      }
    }

    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
    if (!isoPattern.test(startTime) || !isoPattern.test(endTime)) {
      return {
        valid: false,
        error: `Times must be in ISO format (YYYY-MM-DDTHH:MM:SS). Use get_date_info to get correct dates.`
      }
    }
  }

  return { valid: true }
}

/**
 * Check if a message likely requires date information
 * Used to proactively warn about needing get_date_info
 */
export function requiresDateInfo(message: string): boolean {
  const relativeDatePattern = /\b(next|this|last|upcoming|coming|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|yesterday|today)\b/i
  return relativeDatePattern.test(message)
}
