import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/google/oauth'
import { DEFAULT_APP_URL } from '@/lib/constants'

export async function GET() {
  try {
    const authUrl = getAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Failed to generate auth URL:', error)
    return NextResponse.redirect(new URL('/?error=auth_failed', process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL))
  }
}

