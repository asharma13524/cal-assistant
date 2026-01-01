import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { calendarTools, getSystemPrompt } from '@/lib/anthropic/tools'
import { getValidAccessToken, getSession } from '@/lib/auth/session'
import { getCalendarEvents, getCalendarStats, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, addEventAttendee, removeEventAttendee } from '@/lib/google/calendar'
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS, USER_TIMEZONE } from '@/lib/constants'
import {
  parseInUserTimezone,
  isTimeInPast,
  formatTimeInUserTimezone,
  formatDateInUserTimezone,
  formatDateTimeInUserTimezone
} from '@/lib/utils/timezone'
import type { UpdateEventData } from '@/lib/types/calendar'
import type { MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'

interface ChatRequest {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

interface ToolExecutionResult {
  content: string
  modifiedEvents: boolean
}

function getDateInfo(query: string): string {
  const now = new Date()
  const queryLower = query.toLowerCase()

  // Helper to get day of week name
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: USER_TIMEZONE })
  }

  // Helper to format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-CA', { timeZone: USER_TIMEZONE }) // YYYY-MM-DD
  }

  // Current date and time
  if (queryLower.includes('current') || queryLower.includes('now') || queryLower.includes('today')) {
    const dayName = getDayName(now)
    const dateStr = formatDate(now)
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: USER_TIMEZONE
    })
    return `Current date: ${dayName}, ${dateStr} at ${timeStr} (${USER_TIMEZONE})`
  }

  // Tomorrow
  if (queryLower.includes('tomorrow')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return `Tomorrow is ${getDayName(tomorrow)}, ${formatDate(tomorrow)}`
  }

  // Next week - calculate Monday through Friday of next week
  if (queryLower.includes('next week')) {
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const daysUntilNextMonday = currentDay === 0 ? 1 : 8 - currentDay

    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilNextMonday)

    const dates = []
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    for (let i = 0; i < 5; i++) {
      const date = new Date(nextMonday)
      date.setDate(nextMonday.getDate() + i)
      dates.push(`${dayNames[i]} = ${formatDate(date)}`)
    }

    return `Next week (business days):\n${dates.join('\n')}`
  }

  // Next [specific day]
  const dayMatch = queryLower.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)
  if (dayMatch) {
    const targetDayName = dayMatch[1]
    const dayMap: Record<string, number> = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    }

    const targetDay = dayMap[targetDayName]
    const currentDay = now.getDay()

    let daysUntilTarget = targetDay - currentDay
    if (daysUntilTarget <= 0) {
      daysUntilTarget += 7
    }

    const nextDate = new Date(now)
    nextDate.setDate(now.getDate() + daysUntilTarget)

    return `Next ${targetDayName.charAt(0).toUpperCase() + targetDayName.slice(1)} is ${formatDate(nextDate)}`
  }

  // What day is [specific date]
  const dateMatch = queryLower.match(/(\d{4}-\d{2}-\d{2})/)
  if (dateMatch) {
    const dateStr = dateMatch[1]
    const date = new Date(dateStr + 'T12:00:00') // Use noon to avoid timezone issues
    return `${dateStr} is a ${getDayName(date)}`
  }

  return `Current date: ${getDayName(now)}, ${formatDate(now)}`
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'get_date_info': {
        const query = toolInput.query as string
        const result = getDateInfo(query)
        return {
          content: result,
          modifiedEvents: false,
        }
      }

      case 'get_calendar_events': {
        // Parse dates with proper handling for date-only strings
        let startDate: Date
        let endDate: Date

        if (toolInput.start_date) {
          const dateStr = toolInput.start_date as string
          // If it's just a date (no time), set to start of day in local time
          if (dateStr.length <= 10) {
            startDate = new Date(dateStr + 'T00:00:00')
          } else {
            startDate = new Date(dateStr)
          }
        } else {
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
        }

        if (toolInput.end_date) {
          const dateStr = toolInput.end_date as string
          // If it's just a date (no time), set to end of day in local time
          if (dateStr.length <= 10) {
            endDate = new Date(dateStr + 'T23:59:59')
          } else {
            endDate = new Date(dateStr)
          }
        } else {
          endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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
          const attendeeList = e.attendees?.map((a) => a.displayName || a.email).join(', ')
          return `- ${e.summary} on ${formatDateInUserTimezone(start)} from ${formatTimeInUserTimezone(start)} to ${formatTimeInUserTimezone(end)}${attendeeList ? ` with ${attendeeList}` : ''} [ID: ${e.id}]`
        })

        return {
          content: `Found ${events.length} events:\n${eventSummaries.join('\n')}\n\nNote: Use the event ID to update, delete, or manage attendees.`,
          modifiedEvents: false,
        }
      }

      case 'check_availability': {
        const startTime = new Date(toolInput.start_time as string)
        const endTime = new Date(toolInput.end_time as string)

        // Get events that might overlap with the requested time
        const dayStart = new Date(startTime)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(startTime)
        dayEnd.setHours(23, 59, 59, 999)

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
          const tomorrow = new Date(startTime)
          tomorrow.setDate(tomorrow.getDate() + 1)
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

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()
    const session = await getSession()

    if (!accessToken || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { message, history = [] }: ChatRequest = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const client = getAnthropicClient()

    // Build message history
    const messages: MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Detect if message is likely about calendar data (requires tool use)
    const calendarKeywords = /\b(meeting|event|calendar|schedule|busy|free|available|book|cancel|delete|remove|create|add|update|change|reschedule|time|today|tomorrow|week|month|how much|how many)\b/i
    const shouldForceToolUse = calendarKeywords.test(message)

    // Initial API call - force tool use for calendar-related questions
    let response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: getSystemPrompt(),
      tools: calendarTools,
      messages,
      // Force Claude to use at least one tool for calendar questions
      ...(shouldForceToolUse && { tool_choice: { type: 'any' as const } }),
    })

    // Handle tool use in a loop
    let eventsWereModified = false

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
      )

      // Execute tools individually to handle errors gracefully
      const toolResults: ToolResultBlockParam[] = []
      let anyToolModifiedEvents = false

      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executeToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            accessToken
          )

          // Track if any tool modified events
          if (result.modifiedEvents) {
            anyToolModifiedEvents = true
          }

          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result.content,
          })
        } catch (error) {
          console.error(`[Chat API] Tool execution failed for ${toolUse.name}:`, error)
          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
            is_error: true,
          })
        }
      }

      // Track across all tool execution loops
      if (anyToolModifiedEvents) {
        eventsWereModified = true
      }

      // Continue conversation with tool results
      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: getSystemPrompt(),
        tools: calendarTools,
        messages,
      })
    }

    // Extract text response
    const textContent = response.content.find(
      (block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text'
    )

    return NextResponse.json({
      response: textContent?.text || 'I apologize, but I was unable to generate a response.',
      metadata: {
        modifiedEvents: eventsWereModified,
      },
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check for specific error types
    if (errorMessage.includes('invalid_api_key') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        { error: 'API configuration error. Please check the Anthropic API key.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process chat message', details: errorMessage },
      { status: 500 }
    )
  }
}
