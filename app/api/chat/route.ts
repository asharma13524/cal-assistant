import { NextRequest, NextResponse } from 'next/server'
import { getAnthropicClient } from '@/lib/anthropic/client'
import { calendarTools, getSystemPrompt } from '@/lib/anthropic/tools'
import { getValidAccessToken, getSession } from '@/lib/auth/session'
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS, MAX_RETRIES } from '@/lib/constants'
import { executeToolCall, type ToolExecutionResult } from '@/lib/chat/tool-executor'
import { validateToolCall, getCurrentDateContext } from '@/lib/chat/date-enforcer'
import { validateEventDate, clearVerificationCache } from '@/lib/chat/date-validator'
import { detectAction, validateActionCompleted } from '@/lib/chat/action-detector'
import type { MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages'

interface ChatRequest {
  message: string
  history?: { role: 'user' | 'assistant'; content: string }[]
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

          // Clear date verification cache for new conversation
          // (Note: In production, you might want conversation-scoped caching)
          clearVerificationCache()

          // Detect what action the user is requesting
          const requestedAction = detectAction(message)
          const toolsCalled: string[] = []
          let lastToolResult = ''
          let retryCount = 0

          // Inject current date/time context (MCP-like approach)
          const dateContext = getCurrentDateContext()
          const systemPrompt = `${getSystemPrompt()}\n\n${dateContext}`

          // Initial API call - force tool use for calendar-related questions
          const initialStream = client.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: CLAUDE_MAX_TOKENS,
            system: systemPrompt,
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

                // VALIDATE tool call inputs (architectural enforcement)
                const validation = validateToolCall(
                  toolUse.name,
                  toolUse.input as Record<string, unknown>
                )

                if (!validation.valid) {
                  // Return validation error to Claude so it can retry with correct format
                  toolResults.push({
                    type: 'tool_result' as const,
                    tool_use_id: toolUse.id,
                    content: `❌ VALIDATION ERROR: ${validation.error}`,
                    is_error: true,
                  })
                  continue
                }

                // Additional validation for event creation - ensure dates are verified
                if (toolUse.name === 'create_calendar_event') {
                  const startTime = (toolUse.input as Record<string, unknown>).start_time as string
                  const dateValidation = validateEventDate(startTime, message)

                  if (!dateValidation.valid) {
                    toolResults.push({
                      type: 'tool_result' as const,
                      tool_use_id: toolUse.id,
                      content: `❌ DATE VALIDATION ERROR: ${dateValidation.error}`,
                      is_error: true,
                    })
                    continue
                  }
                }

                const result = await executeToolCall(
                  toolUse.name,
                  toolUse.input as Record<string, unknown>,
                  accessToken
                )

                // Track which tools were called
                toolsCalled.push(toolUse.name)

                // Track last tool result for validation hints
                lastToolResult = result.content

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
              system: systemPrompt, // Use same date-context-injected prompt
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

          // CRITICAL VALIDATION: Ensure required tools were called
          const actionValidation = validateActionCompleted(
            requestedAction,
            toolsCalled,
            message,
            { lastToolResult }
          )

          if (!actionValidation.valid && retryCount < MAX_RETRIES) {
            retryCount++

            // Force Claude to retry with the required tools
            currentMessages.push({ role: 'assistant', content: response.content })
            currentMessages.push({
              role: 'user',
              content: [
                {
                  type: 'text' as const,
                  text: `🚨 CRITICAL ERROR - YOU DID NOT COMPLETE THE USER'S REQUEST:\n\n${actionValidation.error}\n\nYou MUST call the required tools to actually perform the action. Do NOT just say you did it - actually DO it by calling the appropriate tool.`
                }
              ]
            })

            // Force tool use on retry
            const retryStream = client.messages.stream({
              model: CLAUDE_MODEL,
              max_tokens: CLAUDE_MAX_TOKENS,
              system: systemPrompt,
              tools: calendarTools,
              messages: currentMessages,
              tool_choice: { type: 'any' as const }, // Force tool use
            })

            // Stream the retry response
            for await (const event of retryStream) {
              if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  send({ type: 'text_delta', content: event.delta.text })
                }
              }
            }

            const retryResponse = await retryStream.finalMessage()

            // Handle any tool calls from retry (simplified - just execute them)
            if (retryResponse.stop_reason === 'tool_use') {
              const retryToolUseBlocks = retryResponse.content.filter(
                (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use'
              )

              const retryToolResults: ToolResultBlockParam[] = []

              for (const toolUse of retryToolUseBlocks) {
                try {
                  send({ type: 'status', message: getToolStatusMessage(toolUse.name) })

                  const result = await executeToolCall(
                    toolUse.name,
                    toolUse.input as Record<string, unknown>,
                    accessToken
                  )

                  // CRITICAL: Track retry tool calls too
                  toolsCalled.push(toolUse.name)

                  // Track result for validation hints
                  lastToolResult = result.content

                  if (result.modifiedEvents) {
                    eventsWereModified = true
                  }

                  retryToolResults.push({
                    type: 'tool_result' as const,
                    tool_use_id: toolUse.id,
                    content: result.content,
                  })
                } catch (error) {
                  console.error(`[Chat API] Retry tool execution failed:`, error)
                  retryToolResults.push({
                    type: 'tool_result' as const,
                    tool_use_id: toolUse.id,
                    content: `Error: ${error instanceof Error ? error.message : 'Tool execution failed'}`,
                    is_error: true,
                  })
                }
              }

              // Get final response after retry tools
              currentMessages.push({ role: 'assistant', content: retryResponse.content })
              currentMessages.push({ role: 'user', content: retryToolResults })

              const finalStream = client.messages.stream({
                model: CLAUDE_MODEL,
                max_tokens: CLAUDE_MAX_TOKENS,
                system: systemPrompt,
                tools: calendarTools,
                messages: currentMessages,
              })

              for await (const event of finalStream) {
                if (event.type === 'content_block_delta') {
                  if (event.delta.type === 'text_delta') {
                    send({ type: 'text_delta', content: event.delta.text })
                  }
                }
              }

              const finalResponse = await finalStream.finalMessage()

              // Validate the retry actually fixed the issue
              const retryValidation = validateActionCompleted(
                requestedAction,
                toolsCalled,
                message,
                { lastToolResult }
              )
              if (!retryValidation.valid) {
                // Don't retry again - we already hit max retries
              }
            }
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
