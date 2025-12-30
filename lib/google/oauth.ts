import { google } from 'googleapis'
import { DEFAULT_APP_URL } from '@/lib/constants'

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
]

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  const redirectUri = `${appUrl}/api/auth/google/callback`

  console.log('[OAuth] Redirect URI:', redirectUri)

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function getAuthUrl() {
  const oauth2Client = getOAuthClient()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
  })
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export async function getUserInfo(accessToken: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  }
}

export function getAuthenticatedClient(accessToken: string) {
  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({ access_token: accessToken })
  return oauth2Client
}

