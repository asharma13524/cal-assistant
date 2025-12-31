import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, getUserInfo } from '@/lib/google/oauth'
import { setSession } from '@/lib/auth/session'
import { APP_URL } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const baseUrl = APP_URL

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL(`/?error=${error}`, baseUrl))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', baseUrl))
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // Get user info
    const user = await getUserInfo(tokens.access_token)

    if (!user.id || !user.email) {
      throw new Error('Failed to get user info')
    }

    // Store session
    await setSession(
      {
        id: user.id,
        email: user.email,
        name: user.name || '',
        picture: user.picture || '',
      },
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
      }
    )

    // Redirect to calendar
    return NextResponse.redirect(new URL('/calendar', baseUrl))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=callback_failed', baseUrl))
  }
}

