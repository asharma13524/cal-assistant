// Claude API configuration
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
export const CLAUDE_MAX_TOKENS = 1024

// Session configuration
export const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 5 minutes
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 1 week

// Calendar configuration
export const DEFAULT_EVENT_RANGE_DAYS = 30
export const DEFAULT_MAX_RESULTS = 500  // Increased to handle Year view
export const STATS_MAX_RESULTS = 100

// App URL - uses env var in production, falls back to localhost for dev
export const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
