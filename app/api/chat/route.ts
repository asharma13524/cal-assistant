import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { calendarTools, SYSTEM_PROMPT } from '@/lib/anthropic/tools'
import { getValidAccessToken, getSession } from '@/lib/auth/session'
import { getCalendarEvents, getCalendarStats, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, addEventAttendee, removeEventAttendee } from '@/lib/google/calendar'
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '@/lib/constants'
import type { MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'

interface ChatRequest {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

interface ToolExecutionResult {
  content: string
  modifiedEvents: boolean
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'get_calendar_events': {
        const startDate = toolInput.start_date
          ? new Date(toolInput.start_date as string)
          : new Date()
        const endDate = toolInput.end_date
          ? new Date(toolInput.end_date as string)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

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
          return `- ${e.summary} on ${start.toLocaleDateString()} from ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${attendeeList ? ` with ${attendeeList}` : ''} [ID: ${e.id}]`
        })

        return {
          content: `Found ${events.length} events:\n${eventSummaries.join('\n')}\n\nNote: Use the event ID to update, delete, or manage attendees.`,
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
        const event = await createCalendarEvent(accessToken, {
          summary: toolInput.title as string,
          description: toolInput.description as string | undefined,
          start: {
            dateTime: toolInput.start_time as string,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: toolInput.end_time as string,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          attendees: (toolInput.attendees as string[] | undefined)?.map((email) => ({ email })),
          location: toolInput.location as string | undefined,
        })

        const eventDate = event.start.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'scheduled'
        return {
          content: `✅ Event created: "${event.summary}" on ${eventDate}${event.htmlLink ? `\nView in Google Calendar: ${event.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'update_calendar_event': {
        const updateData: any = {
          eventId: toolInput.event_id as string,
        }

        if (toolInput.title) updateData.summary = toolInput.title as string
        if (toolInput.description !== undefined) updateData.description = toolInput.description as string
        if (toolInput.location !== undefined) updateData.location = toolInput.location as string
        if (toolInput.start_time) {
          updateData.start = {
            dateTime: toolInput.start_time as string,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        }
        if (toolInput.end_time) {
          updateData.end = {
            dateTime: toolInput.end_time as string,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        }

        const updatedEvent = await updateCalendarEvent(accessToken, updateData)
        const updatedDate = updatedEvent.start.dateTime ? new Date(updatedEvent.start.dateTime).toLocaleString() : 'scheduled'
        return {
          content: `✅ Event updated: "${updatedEvent.summary}" on ${updatedDate}${updatedEvent.htmlLink ? `\nView in Google Calendar: ${updatedEvent.htmlLink}` : ''}`,
          modifiedEvents: true,
        }
      }

      case 'delete_calendar_event': {
        const eventId = toolInput.event_id as string
        await deleteCalendarEvent(accessToken, eventId)
        return {
          content: `✅ Event deleted successfully (ID: ${eventId})`,
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

        // Return a structured email draft
        return {
          content: `📧 **Email Draft**

**To:** ${recipients.join(', ')}
**Subject:** ${subject}

---

${generateEmailBody(context, tone, recipients)}

---
*This is a draft. Copy and send via your email client.*`,
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

function generateEmailBody(context: string, tone: string, recipients: string[]): string {
  const greeting = tone === 'formal' ? 'Dear' : tone === 'casual' ? 'Hey' : 'Hi'
  const signoff = tone === 'formal' ? 'Best regards' : tone === 'casual' ? 'Cheers' : 'Best'

  const firstRecipient = recipients[0] || 'there'

  return `${greeting} ${firstRecipient},

${context}

Please let me know your availability, and I'll send a calendar invite.

${signoff}`
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = await getValidAccessToken()
    const session = await getSession()

    if (!accessToken || !session) {
      console.log('[Chat API] No valid session or token')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { message, history = [] }: ChatRequest = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('[Chat API] Processing message:', message.substring(0, 50) + '...')

    const client = getAnthropicClient()

    // Build message history
    const messages: MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Initial API call
    let response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: calendarTools,
      messages,
    })

    // Handle tool use in a loop
    let eventsWereModified = false

    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
      )

      console.log('[Chat API] Executing tools:', toolUseBlocks.map(t => t.name))

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
        system: SYSTEM_PROMPT,
        tools: calendarTools,
        messages,
      })
    }

    // Extract text response
    const textContent = response.content.find(
      (block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text'
    )

    console.log('[Chat API] Response generated successfully')

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
