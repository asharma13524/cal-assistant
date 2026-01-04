/**
 * Strict date validation to prevent Claude from scheduling on wrong days
 * Tracks whether get_date_info was called before creating events
 */

interface DateVerificationCache {
  [isoDate: string]: {
    dayOfWeek: string
    verifiedAt: number
  }
}

// Track which dates have been verified with get_date_info in this conversation
const verifiedDates: DateVerificationCache = {}

/**
 * Record that a date was verified via get_date_info
 */
export function recordDateVerification(isoDate: string, dayOfWeek: string): void {
  verifiedDates[isoDate] = {
    dayOfWeek,
    verifiedAt: Date.now()
  }
}

/**
 * Check if a date has been verified
 */
export function isDateVerified(isoDate: string): boolean {
  return !!verifiedDates[isoDate]
}

/**
 * Validate that event creation uses verified dates
 */
export function validateEventDate(
  isoDateTime: string,
  userRequestedDay?: string
): { valid: boolean; error?: string } {
  // Extract just the date part (YYYY-MM-DD)
  const dateMatch = isoDateTime.match(/^(\d{4}-\d{2}-\d{2})/)
  if (!dateMatch) {
    return {
      valid: false,
      error: `Invalid datetime format: ${isoDateTime}`
    }
  }

  const isoDate = dateMatch[1]

  // If user mentioned a specific day name (Monday, Tuesday, etc), enforce verification
  if (userRequestedDay) {
    const dayNamePattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    if (dayNamePattern.test(userRequestedDay)) {
      if (!isDateVerified(isoDate)) {
        return {
          valid: false,
          error: `🚨 CRITICAL ERROR: You are trying to create an event on ${isoDate}, but you have NOT verified what day of the week this date is.

The user said: "${userRequestedDay}"

REQUIRED STEPS:
1. Call get_date_info("${userRequestedDay}") to find out the exact ISO date
2. Use the EXACT date returned by that tool
3. Do NOT guess or calculate dates yourself

Your training data about dates is INCORRECT. You MUST use the tool first.`
        }
      }

      // Verify the day name matches
      const verification = verifiedDates[isoDate]
      if (verification && userRequestedDay.toLowerCase().includes(verification.dayOfWeek.toLowerCase().slice(0, 3))) {
        return { valid: true }
      }
    }
  }

  return { valid: true }
}

/**
 * Clear verification cache (for testing or new conversations)
 */
export function clearVerificationCache(): void {
  Object.keys(verifiedDates).forEach(key => delete verifiedDates[key])
}
