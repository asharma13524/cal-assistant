/**
 * Request-scoped cache to avoid redundant API calls
 * Cleared at the start of each chat request
 */

import { CACHE_TTL_MS } from '@/lib/constants'

interface CacheEntry {
  data: unknown
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Generate cache key from function name and parameters
 */
function getCacheKey(fnName: string, params: Record<string, unknown>): string {
  return `${fnName}:${JSON.stringify(params)}`
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(fnName: string, params: Record<string, unknown>): T | null {
  const key = getCacheKey(fnName, params)
  const entry = cache.get(key)

  if (!entry) return null

  const age = Date.now() - entry.timestamp
  if (age > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return entry.data as T
}

/**
 * Store data in cache
 */
export function setCached(fnName: string, params: Record<string, unknown>, data: unknown): void {
  const key = getCacheKey(fnName, params)
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

/**
 * Clear all cached data (call at start of each request)
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Clear expired entries
 */
export function pruneCache(): void {
  const now = Date.now()
  let pruned = 0

  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key)
      pruned++
    }
  }
}
