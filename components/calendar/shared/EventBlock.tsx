import type { CalendarEvent, EventPosition } from '@/lib/types/calendar'
import { getEventColor } from '@/lib/utils/calendar'

interface EventBlockProps {
  event: CalendarEvent
  position: EventPosition
  onClick: () => void
}

function formatTime(dateString: string | undefined) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function EventBlock({ event, position, onClick }: EventBlockProps) {
  const color = getEventColor(event.colorId)
  const startTime = formatTime(event.start.dateTime)
  const endTime = formatTime(event.end.dateTime)

  // Calculate how many lines of text we can fit
  // Assume ~12px line height for title, ~10px for time
  const availableHeight = position.height - 6 // padding
  const canFitTime = availableHeight > 28 // title + time
  const canFitTwoLines = availableHeight > 40 // 2 lines of title + time

  return (
    <button
      onClick={onClick}
      title={`${event.summary}\n${startTime} – ${endTime}${event.location ? `\n📍 ${event.location}` : ''}`}
      className={`absolute ${color.bg} ${color.bgDark} ${color.text} rounded shadow-sm hover:shadow-md hover:brightness-110 hover:z-50 transition-all cursor-pointer overflow-hidden`}
      style={{
        top: `${position.top}px`,
        height: `${Math.max(position.height - 2, 18)}px`, // Small gap between events
        left: `calc(${position.left} + 2px)`,
        width: `calc(${position.width} - 4px)`,
        zIndex: position.zIndex + 10,
        borderLeft: '3px solid rgba(0,0,0,0.2)',
      }}
    >
      <div className="px-1 py-0.5 h-full flex flex-col overflow-hidden text-left">
        {/* Always show title first - Google Calendar style */}
        <div
          className={`font-medium leading-tight ${canFitTwoLines ? 'line-clamp-2' : 'line-clamp-1'}`}
          style={{ fontSize: '11px' }}
        >
          {event.summary}
        </div>

        {/* Only show time if we have room */}
        {canFitTime && (
          <div className="opacity-90 mt-0.5 whitespace-nowrap" style={{ fontSize: '10px' }}>
            {startTime}
          </div>
        )}
      </div>
    </button>
  )
}
