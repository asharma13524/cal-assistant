'use client'

import { useState, useEffect } from 'react'
import type { CalendarEvent } from '@/lib/types/calendar'
import { useCalendarMutations } from '@/hooks/useCalendarMutations'

interface EventDetailModalProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editedSummary, setEditedSummary] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedLocation, setEditedLocation] = useState('')
  const [editedStartTime, setEditedStartTime] = useState('')
  const [editedEndTime, setEditedEndTime] = useState('')
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('')

  const { updateEvent, deleteEvent, addAttendee, removeAttendee } = useCalendarMutations()

  // Reset state when event changes or modal opens
  useEffect(() => {
    if (event) {
      setEditedSummary(event.summary || '')
      setEditedDescription(event.description || '')
      setEditedLocation(event.location || '')
      setEditedStartTime(event.start.dateTime || '')
      setEditedEndTime(event.end.dateTime || '')
      setIsEditing(false)
      setShowDeleteConfirm(false)
      setError(null)
    }
  }, [event, isOpen])

  if (!isOpen || !event) return null

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    const date = new Date(dateTimeStr)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatDateTimeForInput = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    const date = new Date(dateTimeStr)
    // Format as local time for datetime-local input (YYYY-MM-DDTHH:MM)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSave = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Validate times
      if (new Date(editedEndTime) <= new Date(editedStartTime)) {
        setError('End time must be after start time')
        return
      }

      await updateEvent({
        eventId: event.id,
        summary: editedSummary,
        description: editedDescription,
        location: editedLocation,
        start: {
          dateTime: editedStartTime,
        },
        end: {
          dateTime: editedEndTime,
        },
      })

      setIsEditing(false)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await deleteEvent(event.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setIsLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleAddAttendee = async () => {
    if (!newAttendeeEmail.trim()) return

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newAttendeeEmail)) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      await addAttendee(event.id, newAttendeeEmail.trim())
      setNewAttendeeEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attendee')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveAttendee = async (email: string) => {
    try {
      setIsLoading(true)
      setError(null)

      await removeAttendee(event.id, email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove attendee')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedSummary(event.summary || '')
    setEditedDescription(event.description || '')
    setEditedLocation(event.location || '')
    setEditedStartTime(event.start.dateTime || '')
    setEditedEndTime(event.end.dateTime || '')
    setError(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="flex-1 text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 dark:text-white"
              placeholder="Event title"
            />
          ) : (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{event.summary}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Date & Time */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</label>
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="datetime-local"
                  value={formatDateTimeForInput(editedStartTime)}
                  onChange={(e) => setEditedStartTime(new Date(e.target.value).toISOString())}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="datetime-local"
                  value={formatDateTimeForInput(editedEndTime)}
                  onChange={(e) => setEditedEndTime(new Date(e.target.value).toISOString())}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="text-gray-900 dark:text-gray-100">
                <p>{formatDateTime(event.start.dateTime || '')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">to {formatDateTime(event.end.dateTime || '')}</p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
            {isEditing ? (
              <input
                type="text"
                value={editedLocation}
                onChange={(e) => setEditedLocation(e.target.value)}
                placeholder="Add location"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 dark:text-gray-100">{event.location || 'No location'}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Add description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{event.description || 'No description'}</p>
            )}
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attendees</label>
            {event.attendees && event.attendees.length > 0 ? (
              <ul className="space-y-2">
                {event.attendees.slice(0, isEditing ? undefined : 5).map((attendee) => (
                  <li key={attendee.email} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {attendee.displayName || attendee.email}
                      </p>
                      {attendee.displayName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.email}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{attendee.responseStatus || 'no response'}</p>
                    </div>
                    {isEditing && (
                      <button
                        onClick={() => handleRemoveAttendee(attendee.email)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
                {!isEditing && event.attendees.length > 5 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400">
                    and {event.attendees.length - 5} more...
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No attendees</p>
            )}

            {/* Add Attendee */}
            {isEditing && (
              <div className="flex gap-2 mt-2">
                <input
                  type="email"
                  value={newAttendeeEmail}
                  onChange={(e) => setNewAttendeeEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAttendee()
                    }
                  }}
                />
                <button
                  onClick={handleAddAttendee}
                  disabled={isLoading || !newAttendeeEmail.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Google Calendar Link */}
          {!isEditing && event.htmlLink && (
            <div>
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                View in Google Calendar →
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                Save Changes
              </button>
            </>
          ) : showDeleteConfirm ? (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">Are you sure you want to delete this event?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  Delete Event
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Event
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
