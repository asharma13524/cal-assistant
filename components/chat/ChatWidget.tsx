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
              // Add a status message
              const statusMessage: Message = {
                id: Date.now().toString() + Math.random(),
                role: 'status',
                content: data.message
              }
              setMessages(prev => [...prev, statusMessage])
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
        className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen
            ? 'bg-zinc-600 dark:bg-zinc-700 hover:bg-zinc-500 dark:hover:bg-zinc-600 rotate-0'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600 shadow-blue-500/25'
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
        className={`fixed bottom-24 right-6 z-40 w-[420px] max-w-[calc(100vw-3rem)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white">Calendar Assistant</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-500"></p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-zinc-500 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Ask me about your calendar</p>
              <div className="space-y-2 w-full px-2">
                {suggestedQuestions.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(question)}
                    className="w-full text-left text-xs px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white'
                      : message.role === 'status'
                      ? 'bg-transparent text-zinc-500 dark:text-zinc-500 italic text-xs px-2 py-1'
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your calendar..."
              className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50 focus:border-blue-500 dark:focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
