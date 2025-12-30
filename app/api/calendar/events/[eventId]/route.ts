import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/auth/session'
import { updateCalendarEvent, deleteCalendarEvent } from '@/lib/google/calendar'
import type { UpdateEventData } from '@/lib/types/calendar'

export async function PATCH(
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

    const updateData: UpdateEventData = {
      eventId,
      ...body,
    }

    const updatedEvent = await updateCalendarEvent(accessToken, updateData)
    return NextResponse.json({ event: updatedEvent })
  } catch (error) {
    console.error('Error updating calendar event:', error)

    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
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

    await deleteCalendarEvent(accessToken, eventId)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting calendar event:', error)

    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
