import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import { USER_TIMEZONE } from '@/lib/constants'

export const calendarTools: Tool[] = [
  {
    name: 'get_date_info',
    description: 'Get accurate date and time information. Use this to find out what date a specific day of the week falls on, or to get date ranges for relative terms like "next week". ALWAYS call this tool before creating events to ensure you have the correct dates.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'What date information you need. Examples: "next Monday", "next week", "tomorrow", "what day is 2026-01-05", "current date and time"',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a specific date range. Use this to see what meetings are scheduled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (e.g., 2026-01-15). Defaults to today if not provided.',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (e.g., 2026-01-22). Defaults to 7 days from start if not provided.',
        },
      },
      required: [],
    },
  },
  {
    name: 'check_availability',
    description: 'Check if a specific time slot is available (no conflicting events). Use this BEFORE creating an event to avoid scheduling conflicts. Returns whether the slot is free and lists any conflicting events.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_time: {
          type: 'string',
          description: 'Start time to check in ISO format (e.g., 2026-01-15T10:00:00)',
        },
        end_time: {
          type: 'string',
          description: 'End time to check in ISO format (e.g., 2026-01-15T11:00:00)',
        },
      },
      required: ['start_time', 'end_time'],
    },
  },
  {
    name: 'get_calendar_stats',
    description: 'Get statistics about calendar usage including total meeting time, meetings by day, and frequent attendees. Use this to analyze how time is being spent.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. IMPORTANT: Before creating, you should call check_availability to verify the time slot is free. If there are conflicts, inform the user and suggest alternative times.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'The title/summary of the event',
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (e.g., 2026-01-15T10:00:00)',
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (e.g., 2026-01-15T11:00:00)',
        },
        description: {
          type: 'string',
          description: 'Optional description for the event',
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of attendee email addresses',
        },
        location: {
          type: 'string',
          description: 'Optional location for the event',
        },
      },
      required: ['title', 'start_time', 'end_time'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event. Use this when the user wants to modify event details like time, title, location, or description. IMPORTANT: If the user describes an event rather than providing an event ID, you MUST first call get_calendar_events to search for and identify the event, then use its ID to update it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event to update (obtained from get_calendar_events)',
        },
        title: {
          type: 'string',
          description: 'New title/summary for the event (optional)',
        },
        start_time: {
          type: 'string',
          description: 'New start time in ISO format (optional)',
        },
        end_time: {
          type: 'string',
          description: 'New end time in ISO format (optional)',
        },
        description: {
          type: 'string',
          description: 'New description for the event (optional)',
        },
        location: {
          type: 'string',
          description: 'New location for the event (optional)',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event. Use this when the user wants to cancel or remove an event. IMPORTANT: If the user describes an event (e.g., "meeting with John tomorrow at 1PM") rather than providing an event ID, you MUST first call get_calendar_events to search for and identify the event, then use its ID to delete it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event to delete (obtained from get_calendar_events)',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'add_attendee',
    description: 'Add an attendee to an existing calendar event. Use this when the user wants to invite someone to a meeting. IMPORTANT: If the user describes an event rather than providing an event ID, you MUST first call get_calendar_events to find the event ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event (obtained from get_calendar_events)',
        },
        email: {
          type: 'string',
          description: 'Email address of the attendee to add',
        },
      },
      required: ['event_id', 'email'],
    },
  },
  {
    name: 'remove_attendee',
    description: 'Remove an attendee from an existing calendar event. Use this when the user wants to uninvite someone from a meeting. IMPORTANT: If the user describes an event rather than providing an event ID, you MUST first call get_calendar_events to find the event ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The ID of the event (obtained from get_calendar_events)',
        },
        email: {
          type: 'string',
          description: 'Email address of the attendee to remove',
        },
      },
      required: ['event_id', 'email'],
    },
  },
  {
    name: 'draft_email',
    description: 'Signal that you need to compose an email draft for scheduling or calendar-related communication. This tool does NOT generate the email - it returns a prompt for you to compose the email yourself in your response. Use this when the user asks you to draft/write/compose an email.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of recipient email addresses or names',
        },
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        context: {
          type: 'string',
          description: 'Brief context about what the email should communicate (e.g., "notify team about OoO next week", "request meeting reschedule", "inform about calendar block"). You will compose the actual email body based on this context.',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'casual', 'friendly'],
          description: 'The tone for the email (formal, casual, or friendly)',
        },
      },
      required: ['to', 'subject', 'context'],
    },
  },
]

export function getSystemPrompt(): string {
  // Use fixed timezone from constants
  const userTimezone = USER_TIMEZONE
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: userTimezone
  })
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: userTimezone
  })
  // Get the date in the user's timezone
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }) // en-CA gives YYYY-MM-DD
  const todayISO = formatter.format(now)

  return `You are a helpful calendar assistant with access to the user's Google Calendar.

## ⏰ CURRENT DATE AND TIME:
- **Today is: ${todayStr}**
- **ISO format: ${todayISO}**
- **Current time: ${currentTime}**
- **Timezone: ${userTimezone}**

## 🚨 CRITICAL: DATE CALCULATIONS
**NEVER calculate dates yourself. Your internal date calculations may be incorrect.**

⚠️ **MANDATORY: Use the get_date_info tool for ANY date-related questions:**
- Before creating events for "next week", call get_date_info with query "next week"
- Before creating an event for "next Monday", call get_date_info with query "next Monday"
- If unsure what day a date is, call get_date_info with the date
- ALWAYS call get_date_info first, then use the exact dates it returns

**Example workflow:**
1. User says "create OoO events for next week"
2. You call get_date_info with query "next week"
3. Tool returns the actual dates (e.g., Monday = 2026-01-05, Tuesday = 2026-01-06, etc.)
4. You use those EXACT dates to create the events

IMPORTANT:
- All times are in the user's local timezone (${userTimezone}). When the user says "1 PM", generate "13:00:00" - the system handles timezone conversion.

## Your capabilities:
1. View calendar events
2. Analyze calendar usage and patterns
3. Create new events
4. Update existing events
5. Delete/cancel events
6. Manage attendees
7. Draft scheduling emails

## CRITICAL RULES:

### ⚠️ ALWAYS USE TOOLS - NEVER GUESS OR PRETEND
**For ANY question or action about the calendar, you MUST use tools. NEVER make up information.**

**READ operations (questions about calendar):**
- "What meetings do I have?" → CALL get_calendar_events
- "How much time in meetings?" → CALL get_calendar_events, then calculate from results
- "Am I free at 3pm?" → CALL check_availability
- NEVER answer questions about calendar contents without calling a tool first
- NEVER say "you have no meetings" or "you have X meetings" without checking

**WRITE operations (changes to calendar):**
- Delete an event → CALL delete_calendar_event
- Create an event → CALL create_calendar_event
- Update an event → CALL update_calendar_event
- NEVER say you did something without actually calling the tool
- **If you don't call the tool, the action DID NOT HAPPEN**

### For Delete/Update Requests - TWO STEPS REQUIRED:
1. **FIRST**: Call get_calendar_events to find the event and get its ID
2. **THEN**: Call delete_calendar_event or update_calendar_event with that ID
- You cannot delete or update without the event ID
- NEVER skip step 1 - you MUST fetch events first to get the ID

### Date/Time Inference
- **Default to TODAY (${todayStr}) when the user doesn't specify a date**
- If someone says "3PM", assume they mean today at 3PM
- Only ask for clarification if the context is genuinely ambiguous (e.g., "next week" without a specific day)
- Use ISO format for dates: ${todayISO}T15:00:00 for "3PM today"
- **NEVER create events in the past** - if the requested time has already passed today, suggest the next available slot (e.g., "3PM has passed, would you like to schedule for tomorrow at 3PM instead?")

### Before Creating Events - CHECK FOR CONFLICTS
1. **ALWAYS call check_availability before create_calendar_event**
2. If there's a conflict, DO NOT create the event
3. Instead, inform the user of the conflict and suggest alternative times:
   - "1PM is taken by 'Meeting with Sarah'. Would 1:30PM or 2PM work instead?"
4. Only create the event after confirming the slot is free OR the user explicitly says to create it anyway

### Response Style
- Be concise and action-oriented
- Confirm actions with specifics: "Created 'Meeting with Joe' today 3PM-3:30PM"
- Include Google Calendar links when available
- Proactively mention conflicts or potential issues

### Email Drafts - IMPORTANT
When the user asks you to draft an email:
1. Call the draft_email tool with to, subject, context, and tone
2. The tool will return a compose prompt with the email metadata
3. YOU must then compose the actual email in your text response
4. Format it clearly with To, Subject, and Body so the user can copy it
5. Use proper email etiquette: greeting, body, sign-off based on the tone

Remember: Check availability first, then create. Never schedule conflicts without user confirmation.`
}
