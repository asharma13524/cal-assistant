import { USER_TIMEZONE } from '@/lib/constants'
import {
  parseInUserTimezone,
  isTimeInPast,
  formatTimeInUserTimezone,
  formatDateInUserTimezone,
  formatDateTimeInUserTimezone,
  addDaysInUserTimezone,
  startOfDayInUserTimezone,
  endOfDayInUserTimezone,
} from '@/lib/utils/timezone'
import {
  getCalendarEvents,
  getCalendarStats,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  addEventAttendee,
  removeEventAttendee,
} from '@/lib/google/calendar'
import type { UpdateEventData } from '@/lib/types/calendar'
import type { CalendarEvent } from '@/lib/types/calendar'
import { getDateInfo } from './date-info'
import { recordDateVerification } from './date-validator'
import { getCached, setCached } from './request-cache'

export interface ToolExecutionResult {
  content: string
  modifiedEvents: boolean
}

/**
 * Execute a tool call from Claude.
 * Handles all calendar operations and date queries.
 */
export async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'get_date_info': {
        const query = toolInput.query as string
        const result = getDateInfo(query)

        // Record date verifications for validation later
        // Extract ISO dates and day names from the result
        const datePattern = /(\d{4}-\d{2}-\d{2}).*?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi
        let match
        while ((match = datePattern.exec(result)) !== null) {
          const [, isoDate, dayName] = match
          recordDateVerification(isoDate, dayName)
        }

        return {
          content: result,
          modifiedEvents: false,
        }
      }

      case 'get_calendar_events': {
        // VALIDATION: Reject relative date terms - force use of get_date_info first
        const startDateStr = (toolInput.start_date as string)?.toLowerCase() || ''
        const endDateStr = (toolInput.end_date as string)?.toLowerCase() || ''
        const relativeDatePattern = /\b(next|this|last|upcoming|coming|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|yesterday)\b/

        if (relativeDatePattern.test(startDateStr) || relativeDatePattern.test(endDateStr)) {
          return {
            content: '❌ ERROR: Cannot use relative date terms like "next week", "this week", "Monday", etc. in get_calendar_events.\n\n✅ REQUIRED: First call get_date_info tool with your relative date query (e.g., "next week", "this Monday") to get exact ISO dates, THEN call get_calendar_events with those exact dates.',
            modifiedEvents: false,
          }
        }

        // Parse dates with proper handling for date-only strings
        let startDate: Date
        let endDate: Date

        if (toolInput.start_date) {
          const dateStr = toolInput.start_date as string
          // If it's just a date (no time), set to start of day in user's timezone
          if (dateStr.length <= 10) {
            startDate = parseInUserTimezone(dateStr + 'T00:00:00')
          } else {
            startDate = parseInUserTimezone(dateStr)
          }
        } else {
          startDate = startOfDayInUserTimezone(new Date())
        }

        if (toolInput.end_date) {
          const dateStr = toolInput.end_date as string
          // If it's just a date (no time), set to end of day in user's timezone
          if (dateStr.length <= 10) {
            endDate = parseInUserTimezone(dateStr + 'T23:59:59')
          } else {
            endDate = parseInUserTimezone(dateStr)
          }
        } else {
          endDate = addDaysInUserTimezone(new Date(), 7)
        }

        const events = await getCalendarEvents(accessToken, startDate, endDate)

        if (events.length === 0) {
          return {
            content: 'No events found in the specified date range.',
            modifiedEvents: false,
          }
        }

        const eventSummaries = events.map((e) => {
          if (!e.start.dateTime || !e.end.dateTime) {
            // All-day event
            return `- ${e.summary} (All day)${e.attendees?.length ? ` with ${e.attendees.length} attendee(s)` : ''} [ID: ${e.id}]`
          }
          const start = new Date(e.start.dateTime)
          const end = new Date(e.end.dateTime)
          // Format date all at once instead of 4 separate calls
          const fullDate = start.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: USER_TIMEZONE
          })
          const attendeeList = e.attendees?.map((a) => a.displayName || a.email).join(', ')
          return `- ${e.summary} on ${fullDate} from ${formatTimeInUserTimezone(start)} to ${formatTimeInUserTimezone(end)}${attendeeList ? ` with ${attendeeList}` : ''} [ID: ${e.id}]`
        })

        const responseContent = `Found ${events.length} events:\n${eventSummaries.join('\n')}\n\n🚨 CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. When telling the user about these events, copy the EXACT day of week and date shown above
2. DO NOT recalculate what day of week a date falls on - your training data is WRONG
3. DO NOT reformat dates or change the day names
4. If you say "Monday, January 6" in one sentence, do NOT later say "Tuesday, January 6" - they are the SAME date
5. COPY AND PASTE the date strings above when presenting to the user

Note: Use the event ID to update, delete, or manage attendees.`

        return {
          content: responseContent,
          modifiedEvents: false,
        }
      }

      case 'check_availability': {
        const startTime = parseInUserTimezone(toolInput.start_time as string)
        const endTime = parseInUserTimezone(toolInput.end_time as string)

        // Get events that might overlap with the requested time
        const dayStart = startOfDayInUserTimezone(startTime)
        const dayEnd = endOfDayInUserTimezone(startTime)

        const events = await getCalendarEvents(accessToken, dayStart, dayEnd)

        // Check for conflicts
        const conflicts = events.filter((event) => {
          if (!event.start.dateTime || !event.end.dateTime) {
            // All-day event - consider it a conflict for the whole day
            return true
          }
          const eventStart = new Date(event.start.dateTime)
          const eventEnd = new Date(event.end.dateTime)

          // Check if there's any overlap
          return startTime < eventEnd && endTime > eventStart
        })

        if (conflicts.length === 0) {
          return {
            content: `✅ The time slot ${formatTimeInUserTimezone(startTime)} - ${formatTimeInUserTimezone(endTime)} is AVAILABLE. You can proceed to create the event.`,
            modifiedEvents: false,
          }
        }

        const conflictDetails = conflicts.map((c) => {
          const cStart = c.start.dateTime ? formatTimeInUserTimezone(new Date(c.start.dateTime)) : 'All day'
          const cEnd = c.end.dateTime ? formatTimeInUserTimezone(new Date(c.end.dateTime)) : ''
          return `- "${c.summary}" (${cStart}${cEnd ? ` - ${cEnd}` : ''})`
        }).join('\n')

        // Suggest alternative times
        const suggestedTime = new Date(Math.max(...conflicts.map(c => new Date(c.end.dateTime || dayEnd).getTime())))

        return {
          content: `⚠️ CONFLICT DETECTED: The time slot ${formatTimeInUserTimezone(startTime)} - ${formatTimeInUserTimezone(endTime)} overlaps with:\n${conflictDetails}\n\n💡 Suggested alternative: ${formatTimeInUserTimezone(suggestedTime)} (after the last conflicting event)\n\nDo NOT create the event unless the user confirms they want to schedule despite the conflict.`,
          modifiedEvents: false,
        }
      }

      case 'get_calendar_stats': {
        const stats = await getCalendarStats(accessToken)
        return {
          content: `Calendar Statistics (This Week):
- Total meetings: ${stats.totalEvents}
- Total meeting time: ${stats.totalMeetingHours} hours
- Average meetings per day: ${stats.averageMeetingsPerDay}
- Meeting time by day: ${Object.entries(stats.meetingsByDay).map(([day, mins]) => `${day}: ${Math.round(mins / 60 * 10) / 10}h`).join(', ')}
- Most frequent attendees: ${stats.topAttendees.map((a) => `${a.email} (${a.meetingCount} meetings)`).join(', ') || 'None'}`,
          modifiedEvents: false,
        }
      }

      case 'create_calendar_event': {
        // Validate: prevent creating events in the past
        const startTimeStr = toolInput.start_time as string

        if (isTimeInPast(startTimeStr)) {
          const startTime = parseInUserTimezone(startTimeStr)
          const tomorrow = addDaysInUserTimezone(startTime, 1)
          return {
            content: `⚠️ Cannot create event in the past. The requested time (${formatDateTimeInUserTimezone(startTime)}) has already passed. Would you like to schedule for ${formatDateInUserTimezone(tomorrow)} at ${formatTimeInUserTimezone(startTime)} instead?`,
            modifiedEvents: false,
          }
        }

        const event = await createCalendarEvent(accessToken, {
          summary: toolInput.title as string,
          description: toolInput.description as string | undefined,
          start: {
            dateTime: toolInput.start_time as string,
            timeZone: USER_TIMEZONE,
          },
          end: {
            dateTime: toolInput.end_time as string,
            timeZone: USER_TIMEZONE,
          },
          attendees: (toolInput.attendees as string[] | undefined)?.map((email) => ({ email })),
          location: toolInput.location as string | undefined,
        })

        const eventDate = event.start.dateTime ? formatDateTimeInUserTimezone(new Date(event.start.dateTime)) : 'scheduled'
        return {
          content: `✅ Event created: "${event.summary}" on ${eventDate}${event.htmlLink ? `\nView in Google Calendar: ${event.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'update_calendar_event': {
        const updateData: UpdateEventData = {
          eventId: toolInput.event_id as string,
        }

        if (toolInput.title) updateData.summary = toolInput.title as string
        if (toolInput.description !== undefined) updateData.description = toolInput.description as string
        if (toolInput.location !== undefined) updateData.location = toolInput.location as string
        if (toolInput.start_time) {
          updateData.start = {
            dateTime: toolInput.start_time as string,
            timeZone: USER_TIMEZONE,
          }
        }
        if (toolInput.end_time) {
          updateData.end = {
            dateTime: toolInput.end_time as string,
            timeZone: USER_TIMEZONE,
          }
        }

        const updatedEvent = await updateCalendarEvent(accessToken, updateData)
        const updatedDate = updatedEvent.start.dateTime ? formatDateTimeInUserTimezone(new Date(updatedEvent.start.dateTime)) : 'scheduled'
        return {
          content: `✅ Event updated: "${updatedEvent.summary}" on ${updatedDate}${updatedEvent.htmlLink ? `\nView in Google Calendar: ${updatedEvent.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'delete_calendar_event': {
        const eventId = toolInput.event_id as string
        const result = await deleteCalendarEvent(accessToken, eventId)
        return {
          content: `✅ Event "${result.eventTitle}" deleted successfully.`,
          modifiedEvents: true,
        }
      }

      case 'add_attendee': {
        const eventId = toolInput.event_id as string
        const email = toolInput.email as string
        const updatedEvent = await addEventAttendee(accessToken, eventId, email)
        return {
          content: `✅ Added ${email} to "${updatedEvent.summary}". Current attendees: ${updatedEvent.attendees?.map(a => a.email).join(', ') || 'none'}${updatedEvent.htmlLink ? `\nView in Google Calendar: ${updatedEvent.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'remove_attendee': {
        const eventId = toolInput.event_id as string
        const email = toolInput.email as string
        const updatedEvent = await removeEventAttendee(accessToken, eventId, email)
        return {
          content: `✅ Removed ${email} from "${updatedEvent.summary}". Current attendees: ${updatedEvent.attendees?.map(a => a.email).join(', ') || 'none'}${updatedEvent.htmlLink ? `\nView in Google Calendar: ${updatedEvent.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'draft_email': {
        const recipients = toolInput.to as string[]
        const subject = toolInput.subject as string
        const context = toolInput.context as string
        const tone = (toolInput.tone as string) || 'friendly'

        // Return a compose prompt for Claude to write the actual email
        return {
          content: `📧 COMPOSE EMAIL REQUEST
═══════════════════════════════════

To: ${recipients.join(', ')}
Subject: ${subject}
Tone: ${tone}
Context: ${context}

Now compose the full email draft for the user to copy. Include proper greeting, body, and sign-off based on the ${tone} tone.`,
          modifiedEvents: false,
        }
      }

      default:
        return {
          content: `Unknown tool: ${toolName}`,
          modifiedEvents: false,
        }
    }
  } catch (error) {
    console.error(`[Chat] Error executing tool ${toolName}:`, error)
    return {
      content: `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      modifiedEvents: false,
    }
  }
}
