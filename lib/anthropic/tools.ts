import type { Tool } from '@anthropic-ai/sdk/resources/messages'
import { USER_TIMEZONE } from '@/lib/constants'

export const calendarTools: Tool[] = [
  {
    name: 'get_date_info',
    description: 'CRITICAL: Get accurate date and day-of-week information. Your training data has INCORRECT information about what day of the week future dates fall on. You MUST use this tool to find out what date a specific day of the week falls on, or to verify what day-of-week a given date is. Use this for ANY date-related query including "next week", "this week", "next Monday", or to verify "what day is 2026-01-05". ALWAYS call this tool when working with dates - never trust your internal date calculations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'What date information you need. Examples: "next Monday", "next week", "this week", "upcoming week", "tomorrow", "2026-01-05" (to find what day of week it is), "January 6" (to find day of week), "current date and time"',
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
**YOUR TRAINING DATA HAS INCORRECT DATE INFORMATION. NEVER calculate dates or day-of-week yourself.**

⚠️ **MANDATORY RULES - VIOLATION WILL CAUSE BUGS:**

1. **For ANY date mentioned by user OR returned by tools**: Use get_date_info to verify what day of week it is
   - User says "January 5" → Call get_date_info("January 5") to find out if it's Monday, Tuesday, etc.
   - Tool returns "2026-01-06" → Call get_date_info("2026-01-06") to find the day of week
   - NEVER assume you know what day a date falls on based on your training data

2. **When presenting calendar events to users**: Copy the EXACT day-of-week from the tool response
   - Tool says "Monday, January 5, 2026 from 3:00 PM" → Tell user "Monday, January 5, 2026 from 3:00 PM"
   - DO NOT recalculate or change the day of week
   - DO NOT reformat dates
   - Use EXACTLY what the tool returned

3. **When creating events**: Always use get_date_info first
   - User: "schedule coffee Monday at 3pm" → Call get_date_info("next Monday") to get the ISO date, then create event

**Example workflow:**
1. User: "What meetings this week?"
2. Call get_date_info("this week") → Returns "Monday = 2026-01-06, Tuesday = 2026-01-07, ..."
3. Call get_calendar_events with start_date="2026-01-06", end_date="2026-01-10"
4. Tool returns events with days of week already included
5. Present to user using EXACT text from tool response - DO NOT RECALCULATE

**Remember: Your internal knowledge about which day-of-week a date falls on is INCORRECT. Always use tools.**

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

## ⚡ PERFORMANCE - MINIMIZE TOOL CALLS:
**CRITICAL: Be efficient with tool calls to minimize latency!**

- ❌ DON'T call get_calendar_events multiple times for the same date range
- ❌ DON'T call check_availability multiple times for the same time slot
- ❌ DON'T fetch events you already have in the conversation
- ✅ DO reuse event IDs from previous get_calendar_events results
- ✅ DO batch-update multiple events if possible
- ✅ DO trust the data from tool results - don't re-verify unnecessarily

If you already fetched Tuesday's events, USE THOSE EVENT IDs - don't fetch again!

## CRITICAL RULES:

### ⚠️ ALWAYS USE TOOLS - NEVER GUESS OR PRETEND
**For ANY question or action about the calendar, you MUST use tools. NEVER make up information.**

**READ operations (questions about calendar):**
- "What meetings do I have?" → CALL get_calendar_events
- "What meetings do I have next week?" → FIRST call get_date_info("next week"), THEN call get_calendar_events with those exact dates
- "What meetings do I have this week?" → FIRST call get_date_info("this week"), THEN call get_calendar_events with those exact dates
- "What meetings this upcoming week?" → FIRST call get_date_info("upcoming week"), THEN call get_calendar_events with those exact dates
- "How much time in meetings?" → CALL get_calendar_events, then calculate from results
- "Am I free at 3pm?" → CALL check_availability
- NEVER answer questions about calendar contents without calling a tool first
- NEVER say "you have no meetings" or "you have X meetings" without checking
- **For ANY relative date query ("next week", "this week", "upcoming week", "next Monday", etc.), you MUST call get_date_info FIRST to get exact dates, THEN call get_calendar_events**

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

**🚨 CRITICAL - EVENT IDs:**
- Event IDs look like: "hbfaarhpoamm18c9fdl8u5n930" (long alphanumeric strings)
- Event IDs are shown in get_calendar_events results as [ID: ...]
- **NEVER make up event IDs like "meeting_001" or "run_with_mike_monday"**
- **ALWAYS extract the EXACT ID from the tool result**
- If you can't find an ID, call get_calendar_events again

**IMPORTANT - ALL VARIATIONS OF UPDATE LANGUAGE:**
These phrases ALL mean update_calendar_event:
- "move the meeting" → update_calendar_event
- "push back the event" → update_calendar_event
- "delay my run" → update_calendar_event
- "shift the coffee" → update_calendar_event
- "change the time" → update_calendar_event
- "reschedule to X" → update_calendar_event
- "make it 30 minutes later" → update_calendar_event
- "adjust the start time" → update_calendar_event

**YOU MUST CALL THE TOOL - DO NOT JUST SAY YOU DID IT!**
- ❌ WRONG: "I've moved your meeting to 3:30pm" (without calling update_calendar_event)
- ✅ CORRECT: Call update_calendar_event, THEN say "I've moved your meeting"

**CRITICAL FOR MULTIPLE UPDATES:**
If user says "move everything" or "update all meetings":
1. Call get_calendar_events to find all events
2. For EACH event: Call update_calendar_event with the event ID
3. DO NOT say "I've updated all meetings" unless you called update_calendar_event for EACH ONE
4. You MUST make multiple update_calendar_event calls (one per event)

### Date/Time Inference
- **Default to TODAY (${todayStr}) when the user doesn't specify a date**
- If someone says "3PM", assume they mean today at 3PM
- Only ask for clarification if the context is genuinely ambiguous (e.g., "next week" without a specific day)
- Use ISO format for dates: ${todayISO}T15:00:00 for "3PM today"
- **NEVER create events in the past** - if the requested time has already passed today, suggest the next available slot (e.g., "3PM has passed, would you like to schedule for tomorrow at 3PM instead?")

### Before Creating Events - CHECK FOR CONFLICTS
1. **Call check_availability before create_calendar_event** (for NEW events only)
2. If there's a conflict, DO NOT create the event
3. Instead, inform the user of the conflict and suggest alternative times:
   - "1PM is taken by 'Meeting with Sarah'. Would 1:30PM or 2PM work instead?"
4. Only create the event after confirming the slot is free OR the user explicitly says to create it anyway

**IMPORTANT:** You do NOT need check_availability when:
- Updating existing events (just update them directly)
- User says "move everything" (they want it done regardless)
- You already checked and the slot is free

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
