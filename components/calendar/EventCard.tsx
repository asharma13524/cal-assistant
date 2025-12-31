import type { CalendarEvent } from '@/lib/types/calendar'
import { getEventColor, getInitials, getAvatarColor } from '@/lib/utils/calendar'

function formatTime(dateString: string | undefined) {
  if (!dateString) return 'All day'
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface EventCardProps {
  event: CalendarEvent
  onClick: () => void
  showColor?: boolean
}

export function EventCard({ event, onClick, showColor = false }: EventCardProps) {
  const startTime = formatTime(event.start.dateTime)
  const endTime = formatTime(event.end.dateTime)
  const color = getEventColor(event.colorId)

  // Get first 3 attendees for avatars
  const visibleAttendees = event.attendees?.slice(0, 3) || []
  const remainingCount = (event.attendees?.length || 0) - visibleAttendees.length

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 ${
        showColor
          ? `${color.light} ${color.lightDark} border-l-2 ${color.border} ${color.borderDark}`
          : 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
      } rounded-r-lg hover:bg-opacity-80 dark:hover:bg-opacity-30 transition-colors cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-sm text-zinc-900 dark:text-white truncate">
            {event.summary}
          </h4>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-semibold">
            {startTime} – {endTime}
          </p>
          {event.location && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              📍 {event.location}
            </p>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              {visibleAttendees.map((attendee, i) => {
                const initials = getInitials(attendee.displayName || attendee.email)
                const avatarColor = getAvatarColor(attendee.email)
                return (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-full ${avatarColor} flex items-center justify-center text-[8px] font-semibold text-white`}
                    title={attendee.displayName || attendee.email}
                  >
                    {initials}
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 ml-0.5">
                  +{remainingCount}
                </span>
              )}
            </div>
          )}
        </div>
        <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
