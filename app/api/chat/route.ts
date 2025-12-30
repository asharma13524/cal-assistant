import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { calendarTools, SYSTEM_PROMPT } from '@/lib/anthropic/tools'
import { getValidAccessToken, getSession } from '@/lib/auth/session'
import { getCalendarEvents, getCalendarStats, createCalendarEvent } from '@/lib/google/calendar'
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '@/lib/constants'
import type { MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'

interface ChatRequest {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
}

async function executeToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  accessToken: string
): Promise<string> {
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
          return 'No events found in the specified date range.'
        }

        const eventSummaries = events.map((e) => {
          if (!e.start.dateTime || !e.end.dateTime) {
            // All-day event
            return `- ${e.summary} (All day)${e.attendees?.length ? ` with ${e.attendees.length} attendee(s)` : ''}`
          }
          const start = new Date(e.start.dateTime)
          const end = new Date(e.end.dateTime)
          const attendeeList = e.attendees?.map((a) => a.displayName || a.email).join(', ')
          return `- ${e.summary} on ${start.toLocaleDateString()} from ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${attendeeList ? ` with ${attendeeList}` : ''}`
        })

        return `Found ${events.length} events:\n${eventSummaries.join('\n')}`
      }

      case 'get_calendar_stats': {
        const stats = await getCalendarStats(accessToken)
        return `Calendar Statistics (This Week):
- Total meetings: ${stats.totalEvents}
- Total meeting time: ${stats.totalMeetingHours} hours
- Average meetings per day: ${stats.averageMeetingsPerDay}
- Meeting time by day: ${Object.entries(stats.meetingsByDay).map(([day, mins]) => `${day}: ${Math.round(mins / 60 * 10) / 10}h`).join(', ')}
- Most frequent attendees: ${stats.topAttendees.map((a) => `${a.email} (${a.meetingCount} meetings)`).join(', ') || 'None'}`
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
        return `✅ Event created: "${event.summary}" on ${eventDate}${event.htmlLink ? `\nView in Google Calendar: ${event.htmlLink}` : ''}`
      }

      case 'draft_email': {
        const recipients = toolInput.to as string[]
        const subject = toolInput.subject as string
        const context = toolInput.context as string
        const tone = (toolInput.tone as string) || 'friendly'

        // Return a structured email draft
        return `📧 **Email Draft**

**To:** ${recipients.join(', ')}
**Subject:** ${subject}

---

${generateEmailBody(context, tone, recipients)}

---
*This is a draft. Copy and send via your email client.*`
      }

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (error) {
    console.error(`[Chat] Error executing tool ${toolName}:`, error)
    return `Error executing ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
    while (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
      )

      console.log('[Chat API] Executing tools:', toolUseBlocks.map(t => t.name))

      // Execute tools individually to handle errors gracefully
      const toolResults: ToolResultBlockParam[] = []
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await executeToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            accessToken
          )
          toolResults.push({
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
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
