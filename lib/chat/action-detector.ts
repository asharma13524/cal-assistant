/**
 * Action Detection and Enforcement
 * Detects when user wants to modify calendar and ensures tools are used
 */

/**
 * Action keywords that indicate calendar modifications
 */
const ACTION_PATTERNS = {
  create: /\b(schedule|book|create|add|set up|make|plan)\b/i,
  update: /\b(move|push|shift|delay|change|update|reschedule|modify|adjust|extend|shorten)\b/i,
  delete: /\b(cancel|delete|remove|clear|drop)\b/i,
  attendees: /\b(invite|add|remove|uninvite)\b.*\b(to|from)\b/i,
}

/**
 * Detect what type of action the user is requesting
 */
export function detectAction(message: string): 'create' | 'update' | 'delete' | 'attendees' | 'read' | null {
  if (ACTION_PATTERNS.delete.test(message)) return 'delete'
  if (ACTION_PATTERNS.update.test(message)) return 'update'
  if (ACTION_PATTERNS.attendees.test(message)) return 'attendees'
  if (ACTION_PATTERNS.create.test(message)) return 'create'

  // Check for read operations
  if (/\b(show|list|what|when|get|find|check|view|see)\b/i.test(message)) {
    return 'read'
  }

  return null
}

/**
 * Tool names required for each action type
 */
const REQUIRED_TOOLS: Record<string, string[]> = {
  create: ['create_calendar_event'],
  update: ['get_calendar_events', 'update_calendar_event'],
  delete: ['get_calendar_events', 'delete_calendar_event'],
  attendees: ['get_calendar_events', 'add_attendee', 'remove_attendee'],
  read: ['get_calendar_events', 'get_calendar_stats', 'check_availability'],
}

/**
 * Validate that required tools were called for an action
 */
export function validateActionCompleted(
  action: string | null,
  toolsCalled: string[],
  userMessage?: string,
  conversationContext?: { lastToolResult?: string }
): { valid: boolean; error?: string } {

  if (!action || action === 'read') {
    return { valid: true }
  }

  const required = REQUIRED_TOOLS[action] || []
  const updateTools = ['update_calendar_event']
  const deleteTools = ['delete_calendar_event']
  const createTools = ['create_calendar_event']

  // For update actions, must call update_calendar_event
  if (action === 'update') {
    const updateCount = toolsCalled.filter(t => updateTools.includes(t)).length
    const hasCalledGetEvents = toolsCalled.includes('get_calendar_events')

    if (updateCount === 0) {
      // Check if we have event IDs from get_calendar_events
      let eventIdsHint = ''
      let hasEventIds = false

      if (conversationContext?.lastToolResult) {
        const idMatches = conversationContext.lastToolResult.match(/\[ID: ([^\]]+)\]/g)
        if (idMatches && idMatches.length > 0) {
          const ids = idMatches.map(m => m.match(/\[ID: ([^\]]+)\]/)?.[1]).filter(Boolean)
          hasEventIds = true
          eventIdsHint = `\n\n🎯 EVENTS YOU NEED TO UPDATE (USE THESE EXACT IDs):\n${ids.map(id => `- Event ID: "${id}" → Call update_calendar_event(event_id="${id}", start_time="...", end_time="...")`).join('\n')}\n\n⚠️ DO NOT MAKE UP EVENT IDs! Use the EXACT IDs shown above.`
        }
      }

      // If no event IDs available, Claude must fetch events first
      if (!hasEventIds || !hasCalledGetEvents) {
        return {
          valid: false,
          error: `❌ CRITICAL ERROR: User requested to UPDATE calendar events, but you did NOT call update_calendar_event.

🚨 TWO-STEP PROCESS REQUIRED 🚨

STEP 1: Call get_calendar_events to fetch the events and get their IDs
STEP 2: For EACH event, call update_calendar_event with the REAL event ID (not a made-up ID!)

DO NOT:
- Make up event IDs like "event_001" or "event_002"
- Skip get_calendar_events
- Say you updated without actually calling the tools

YOU MUST CALL THE ACTUAL TOOLS!`
        }
      }

      // If we have event IDs, just remind to use them
      return {
        valid: false,
        error: `❌ CRITICAL ERROR: User requested to UPDATE calendar events, but you did NOT call update_calendar_event.

🚨 YOU MUST CALL update_calendar_event TOOL NOW 🚨
${eventIdsHint}

STOP saying you updated it. ACTUALLY CALL THE TOOL using the exact event IDs shown above!`
      }
    }

    // Check for "move everything" or "update all" patterns
    if (userMessage && /(move|update|change|shift).*(everything|all)/i.test(userMessage)) {
      // If user wants to update multiple events, we should see multiple update calls
      // Or at least a clear indication that Claude is working on it
      if (updateCount < 2) {
        // Warning: User requested to update "all/everything" but only a few update calls made
      }
    }
  }

  // For delete actions, must call delete_calendar_event
  if (action === 'delete') {
    const calledDelete = toolsCalled.some(t => deleteTools.includes(t))
    if (!calledDelete) {
      return {
        valid: false,
        error: `User requested to DELETE/CANCEL a calendar event, but you did NOT call delete_calendar_event. You MUST actually delete the event, not just say you did it.`
      }
    }
  }

  // For create actions, must call create_calendar_event
  if (action === 'create') {
    const calledCreate = toolsCalled.some(t => createTools.includes(t))
    if (!calledCreate) {
      return {
        valid: false,
        error: `User requested to CREATE/SCHEDULE a calendar event, but you did NOT call create_calendar_event. You MUST actually create the event, not just say you did it.`
      }
    }
  }

  return { valid: true }
}

/**
 * Detect if response claims to have done something without tool use
 */
export function detectFalseCompletion(responseText: string): boolean {
  const claimPatterns = [
    /I'?ve (moved|updated|changed|rescheduled|cancelled|deleted|created|scheduled)/i,
    /Successfully (moved|updated|changed|rescheduled|cancelled|deleted|created|scheduled)/i,
    /The (meeting|event) has been (moved|updated|changed|rescheduled|cancelled|deleted)/i,
  ]

  return claimPatterns.some(pattern => pattern.test(responseText))
}
