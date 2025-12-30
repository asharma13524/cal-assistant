import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth/session'
import { DEFAULT_APP_URL } from '@/lib/constants'

export async function POST() {
  await clearSession()
  return NextResponse.json({ success: true })
}

export async function GET() {
  await clearSession()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
  return NextResponse.redirect(new URL('/', baseUrl))
}

