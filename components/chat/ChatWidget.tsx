'use client'

import { useState, useRef, useEffect } from 'react'
import { useSWRConfig } from 'swr'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'status'
  content: string
}

export function ChatWidget() {
  const { mutate } = useSWRConfig()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // We'll create the assistant message when we receive the first text
    const assistantMessageId = (Date.now() + 1).toString()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          // Filter out status messages from history
          history: messages
            .filter(m => m.role !== 'status')
            .map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let hasReceivedText = false

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines (newline-delimited JSON)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const data = JSON.parse(line)

            if (data.type === 'text_delta') {
              // On first text delta, remove loading state and status messages
              if (!hasReceivedText) {
                hasReceivedText = true
                setIsLoading(false)
                setMessages(prev => {
                  // Remove status messages and add the assistant message
                  const filtered = prev.filter(msg => msg.role !== 'status')
                  return [...filtered, {
                    id: assistantMessageId,
                    role: 'assistant' as const,
                    content: data.content
                  }]
                })
              } else {
                // Append text to the assistant's message
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ))
              }
            } else if (data.type === 'status') {
              // Only show status messages before text starts streaming
              if (!hasReceivedText) {
                const statusMessage: Message = {
                  id: Date.now().toString() + Math.random(),
                  role: 'status',
                  content: data.message
                }
                setMessages(prev => [...prev, statusMessage])
              }
            } else if (data.type === 'done') {
              // Trigger cache revalidation if events were modified
              if (data.metadata?.modifiedEvents) {
                mutate(
                  (key) => typeof key === 'string' && key.startsWith('/api/calendar/events'),
                  undefined,
                  { revalidate: true }
                )
              }
            } else if (data.type === 'error') {
              // Show error in the assistant's message
              setMessages(prev => {
                const existing = prev.find(msg => msg.id === assistantMessageId)
                if (existing) {
                  return prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + '\n\n⚠️ ' + data.message }
                      : msg
                  )
                } else {
                  // Create assistant message with error
                  return [...prev.filter(msg => msg.role !== 'status'), {
                    id: assistantMessageId,
                    role: 'assistant' as const,
                    content: '⚠️ ' + data.message
                  }]
                }
              })
            }
          } catch (parseError) {
            console.error('Error parsing stream chunk:', parseError, 'Line:', line)
          }
        }
      }

      // If the assistant message doesn't exist or is empty, show a fallback
      setMessages(prev => {
        const existing = prev.find(msg => msg.id === assistantMessageId)
        if (!existing) {
          // No message received at all
          return [...prev.filter(msg => msg.role !== 'status'), {
            id: assistantMessageId,
            role: 'assistant' as const,
            content: 'I apologize, but I was unable to generate a response.'
          }]
        } else if (!existing.content.trim()) {
          // Message exists but is empty
          return prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: 'I apologize, but I was unable to generate a response.' }
              : msg
          )
        }
        return prev
      })
    } catch (error) {
      console.error('Chat error:', error)
      // Update or create the assistant message with error
      setMessages(prev => {
        const existing = prev.find(msg => msg.id === assistantMessageId)
        if (existing) {
          return prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
              : msg
          )
        } else {
          // Create assistant message with error
          return [...prev.filter(msg => msg.role !== 'status'), {
            id: assistantMessageId,
            role: 'assistant' as const,
            content: 'Sorry, I encountered an error. Please try again.'
          }]
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    "What meetings do I have this week?",
    "How much time am I spending in meetings?",
    "Schedule a team meeting for tomorrow at 2pm",
  ]

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-300 ${
          isOpen
            ? 'bg-stone-700 dark:bg-stone-800 hover:bg-stone-600 dark:hover:bg-stone-700 rotate-0 scale-100'
            : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-primary-500/30 scale-100 hover:scale-105'
        }`}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-40 w-[440px] max-w-[calc(100vw-3rem)] bg-white dark:bg-stone-950 rounded-3xl shadow-2xl border border-stone-200/50 dark:border-stone-800/50 backdrop-blur-xl overflow-hidden transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200/60 dark:border-stone-800/60 bg-gradient-to-b from-stone-50/90 to-white/90 dark:from-stone-900/90 dark:to-stone-950/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm shadow-primary-500/20">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 tracking-tight">Calendar Assistant</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Powered by Claude</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-5 space-y-3 bg-stone-50/40 dark:bg-stone-950/40">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Ask about your calendar</p>
              <p className="text-xs text-stone-500 dark:text-stone-500 mb-5">I can help you schedule, check availability, and more</p>
              <div className="space-y-2 w-full">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="w-full text-left text-xs px-3.5 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-700 dark:hover:text-primary-400 transition-all hover:shadow-sm font-medium"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} message-enter`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/20 font-medium'
                      : message.role === 'status'
                      ? 'bg-transparent text-stone-500 dark:text-stone-500 italic text-xs px-2 py-1 status-pulse'
                      : 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200/60 dark:border-stone-800/60 shadow-sm leading-relaxed'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start message-enter">
              <div className="bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800/60 px-4 py-3 rounded-2xl shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary-400 dark:bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-stone-200/60 dark:border-stone-800/60 bg-gradient-to-b from-white/90 to-stone-50/90 dark:from-stone-950/90 dark:to-stone-900/90 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your calendar..."
              className="flex-1 px-4 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:focus:ring-primary-400/40 focus:border-primary-400 dark:focus:border-primary-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary-500/20 hover:shadow-md hover:shadow-primary-500/30 disabled:shadow-none"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
