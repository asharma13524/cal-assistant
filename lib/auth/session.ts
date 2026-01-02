import { cookies } from 'next/headers'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { refreshAccessToken } from '@/lib/google/oauth'
import { TOKEN_EXPIRY_BUFFER_MS, COOKIE_MAX_AGE_SECONDS } from '@/lib/constants'

const SESSION_COOKIE = 'session'
const TOKEN_COOKIE = 'google_tokens'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

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

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. Generate one with: openssl rand -hex 32'
    )
  }
  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 characters (32 bytes in hex). Generate with: openssl rand -hex 32'
    )
  }
  return Buffer.from(key, 'hex')
}

function encode(data: object): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const plaintext = JSON.stringify(data)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decode<T>(encoded: string): T | null {
  try {
    const key = getEncryptionKey()
    const parts = encoded.split(':')

    if (parts.length !== 3) {
      return null
    }

    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return JSON.parse(decrypted)
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
