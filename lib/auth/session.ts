import { cookies } from 'next/headers'
import { refreshAccessToken } from '@/lib/google/oauth'
import { TOKEN_EXPIRY_BUFFER_MS, COOKIE_MAX_AGE_SECONDS } from '@/lib/constants'

const SESSION_COOKIE = 'session'
const TOKEN_COOKIE = 'google_tokens'

export interface Session {
  user: {
    id: string
    email: string
    name: string
    picture: string
  }
}

export interface StoredTokens {
  access_token: string
  refresh_token?: string
  expiry_date?: number
}

// Encrypt/decrypt helpers (simple base64 for demo - use proper encryption in production)
function encode(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

function decode<T>(encoded: string): T | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export async function setSession(user: Session['user'], tokens: StoredTokens) {
  const cookieStore = await cookies()

  // Set session cookie (user info)
  cookieStore.set(SESSION_COOKIE, encode({ user }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })

  // Set tokens cookie (access/refresh tokens)
  cookieStore.set(TOKEN_COOKIE, encode(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE)

  if (!sessionCookie?.value) {
    return null
  }

  return decode<Session>(sessionCookie.value)
}

export async function getTokens(): Promise<StoredTokens | null> {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get(TOKEN_COOKIE)

  if (!tokenCookie?.value) {
    return null
  }

  return decode<StoredTokens>(tokenCookie.value)
}

export async function updateTokens(tokens: StoredTokens) {
  const cookieStore = await cookies()

  cookieStore.set(TOKEN_COOKIE, encode(tokens), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getTokens()

  if (!tokens?.access_token) {
    return null
  }

  // Check if token is expired (with buffer)
  const isExpired = tokens.expiry_date
    ? Date.now() > tokens.expiry_date - TOKEN_EXPIRY_BUFFER_MS
    : false

  if (isExpired && tokens.refresh_token) {
    try {
      const newCredentials = await refreshAccessToken(tokens.refresh_token)

      if (newCredentials.access_token) {
        const updatedTokens: StoredTokens = {
          access_token: newCredentials.access_token,
          refresh_token: newCredentials.refresh_token || tokens.refresh_token,
          expiry_date: newCredentials.expiry_date || undefined,
        }

        await updateTokens(updatedTokens)
        return newCredentials.access_token
      }
    } catch (error) {
      console.error('[Auth] Failed to refresh token:', error)
      return null
    }
  }

  return tokens.access_token
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(TOKEN_COOKIE)
}
