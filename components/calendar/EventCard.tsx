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
      className={`group w-full text-left p-3.5 ${
        showColor
          ? `${color.light} ${color.lightDark} border-l-3 ${color.border} ${color.borderDark}`
          : 'bg-primary-50 dark:bg-primary-900/20 border-l-3 border-primary-500'
      } rounded-r-2xl hover:bg-opacity-80 dark:hover:bg-opacity-30 transition-all cursor-pointer hover:shadow-sm animate-fade-in`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm text-stone-900 dark:text-stone-100 truncate">
            {event.summary}
          </h4>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-semibold">
            {startTime} – {endTime}
          </p>
          {event.location && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 truncate flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location}
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
                    className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white dark:ring-stone-900`}
                    title={attendee.displayName || attendee.email}
                  >
                    {initials}
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <span className="text-[10px] text-stone-500 dark:text-stone-400 ml-1 font-semibold">
                  +{remainingCount}
                </span>
              )}
            </div>
          )}
        </div>
        <svg className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
