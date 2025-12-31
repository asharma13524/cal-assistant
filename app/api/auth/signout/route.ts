import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth/session'
import { APP_URL } from '@/lib/constants'

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

export async function GET() {
  await clearSession()
  const baseUrl = APP_URL
  return NextResponse.redirect(new URL('/', baseUrl))
}

