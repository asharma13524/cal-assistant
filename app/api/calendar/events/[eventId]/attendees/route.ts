import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/auth/session'
import { addEventAttendee, removeEventAttendee } from '@/lib/google/calendar'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const updatedEvent = await addEventAttendee(accessToken, eventId, email)
    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('Error adding attendee:', error)

    if (error instanceof Error) {
      if (error.message.includes('already invited')) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      if (error.message.includes('404') || error.message.includes('not found')) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to add attendee' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const accessToken = await getValidAccessToken()

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const updatedEvent = await removeEventAttendee(accessToken, eventId, email)
    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('Error removing attendee:', error)

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to remove attendee' }, { status: 500 })
  }
}
