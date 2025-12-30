import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const calendarTools: Tool[] = [
  {
    name: 'get_calendar_events',
    description: 'Get calendar events for a specific date range. Use this to see what meetings are scheduled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (e.g., 2024-01-15). Defaults to today if not provided.',
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (e.g., 2024-01-22). Defaults to 7 days from start if not provided.',
        },
      },
      required: [],
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
    description: 'Create a new calendar event. Use this when the user wants to schedule a meeting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'The title/summary of the event',
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO format (e.g., 2024-01-15T10:00:00)',
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO format (e.g., 2024-01-15T11:00:00)',
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
    description: 'Draft an email for scheduling or calendar-related communication. Returns the email content that the user can review and send.',
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
          description: 'Context about what the email should communicate (e.g., scheduling a meeting, requesting availability)',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'casual', 'friendly'],
          description: 'The tone of the email',
        },
      },
      required: ['to', 'subject', 'context'],
    },
  },
]

export const SYSTEM_PROMPT = `You are a helpful calendar assistant with access to the user's Google Calendar. You can:

1. **View calendar events** - See what meetings are scheduled
2. **Analyze calendar usage** - Provide insights on meeting time, frequency, and patterns
3. **Create new events** - Schedule meetings when requested
4. **Update events** - Modify existing event details (time, title, location, description)
5. **Delete events** - Cancel or remove events from the calendar
6. **Manage attendees** - Add or remove people from meetings
7. **Draft emails** - Write scheduling-related emails for the user

When the user asks about their calendar or scheduling:
- Use the available tools to fetch real data before responding
- Provide specific, actionable insights
- Be concise but thorough

When modifying, deleting, or managing attendees for events:
- If the user describes an event (e.g., "my meeting with John tomorrow") rather than providing an event ID:
  1. ALWAYS call get_calendar_events first with the appropriate date range to find the event
  2. Identify the correct event from the results (match on time, title, attendees, etc.)
  3. Extract the event ID from the results
  4. Then call the appropriate tool (update/delete/add_attendee/remove_attendee) with that event ID
- Confirm the action was successful with a clear message
- Include the event link in your response when available

When drafting emails:
- Match the requested tone
- Include specific details from the calendar context
- Format the email clearly with To, Subject, and Body sections

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Remember: Always use tools to get real calendar data rather than making assumptions.`

