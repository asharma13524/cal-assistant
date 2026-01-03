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
  formatDateTimeInUserTimezone,
  addDaysInUserTimezone,
  startOfDayInUserTimezone,
  endOfDayInUserTimezone
} from '@/lib/utils/timezone'
import type { UpdateEventData } from '@/lib/types/calendar'
import type { MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'
import * as chrono from 'chrono-node'

interface ChatRequest {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

interface ToolExecutionResult {
  content: string
  modifiedEvents: boolean
}

function getToolStatusMessage(toolName: string): string {
  const messages: Record<string, string> = {
    'get_date_info': 'Getting date information...',
    'get_calendar_events': 'Checking your calendar...',
    'check_availability': 'Checking availability...',
    'get_calendar_stats': 'Calculating calendar statistics...',
    'create_calendar_event': 'Creating event...',
    'update_calendar_event': 'Updating event...',
    'delete_calendar_event': 'Deleting event...',
    'add_attendee': 'Adding attendee...',
    'remove_attendee': 'Removing attendee...',
    'draft_email': 'Drafting email...',
  }
  return messages[toolName] || `Executing ${toolName}...`
}

function getDateInfo(query: string): string {
  const queryLower = query.toLowerCase()
  const now = new Date()

  // Helper functions
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: USER_TIMEZONE })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-CA', { timeZone: USER_TIMEZONE }) // YYYY-MM-DD
  }

  const getDayOfWeek = (date: Date): number => {
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: USER_TIMEZONE })
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 }
    return dayMap[dayStr] || 0
  }

  const formatBusinessWeek = (startMonday: Date): string => {
    const dates = []
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    for (let i = 0; i < 5; i++) {
      const date = addDaysInUserTimezone(startMonday, i)
      dates.push(`${dayNames[i]} = ${formatDate(date)}`)
    }
    return dates.join('\n')
  }

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
    return `${getDayName(startDate)}, ${formatDate(startDate)}`
  }

  // Fallback to current date
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

        const responseContent = `Found ${events.length} events:\n${eventSummaries.join('\n')}\n\n⚠️ CRITICAL: When presenting these events to the user, use the EXACT day of week and dates shown above. DO NOT recalculate or reformat them.\n\nNote: Use the event ID to update, delete, or manage attendees.`

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

    // Create a readable stream for streaming responses
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }

        try {
          let eventsWereModified = false
          let currentMessages = [...messages]

          // Initial API call - force tool use for calendar-related questions
          const initialStream = client.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: CLAUDE_MAX_TOKENS,
            system: getSystemPrompt(),
            tools: calendarTools,
            messages: currentMessages,
            // Force Claude to use at least one tool for calendar questions
            ...(shouldForceToolUse && { tool_choice: { type: 'any' as const } }),
          })

          // Stream text deltas from initial response
          for await (const event of initialStream) {
            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                send({ type: 'text_delta', content: event.delta.text })
              }
            }
          }

          // Get the final message
          let response = await initialStream.finalMessage()

          // Handle tool use in a loop
          while (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(
              (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
            )

            // Execute tools individually to handle errors gracefully
            const toolResults: ToolResultBlockParam[] = []
            let anyToolModifiedEvents = false

            for (const toolUse of toolUseBlocks) {
              try {
                // Send status message before executing tool
                send({ type: 'status', message: getToolStatusMessage(toolUse.name) })

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
                send({
                  type: 'error',
                  message: `Error executing ${toolUse.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
                })
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
            currentMessages.push({ role: 'assistant', content: response.content })
            currentMessages.push({ role: 'user', content: toolResults })

            // Stream the next response
            const nextStream = client.messages.stream({
              model: CLAUDE_MODEL,
              max_tokens: CLAUDE_MAX_TOKENS,
              system: getSystemPrompt(),
              tools: calendarTools,
              messages: currentMessages,
            })

            // Stream text deltas
            for await (const event of nextStream) {
              if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  send({ type: 'text_delta', content: event.delta.text })
                }
              }
            }

            response = await nextStream.finalMessage()
          }

          // Send done message with metadata
          send({ type: 'done', metadata: { modifiedEvents: eventsWereModified } })
          controller.close()
        } catch (error) {
          console.error('[Chat API] Streaming error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          send({ type: 'error', message: `Failed to process chat message: ${errorMessage}` })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
