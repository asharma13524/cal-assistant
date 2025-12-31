import { getTimeSlots } from '@/lib/utils/calendar'

interface TimelineGridProps {
  startHour?: number
  endHour?: number
  hourHeight?: number
}

export function TimelineGrid({ startHour = 6, endHour = 22, hourHeight = 60 }: TimelineGridProps) {
  const timeSlots = getTimeSlots(startHour, endHour)

  return (
    <div className="relative">
      {/* Time labels and grid lines */}
      {timeSlots.map((time, index) => {
        const hour = startHour + index
        return (
          <div
            key={hour}
            className="flex items-start border-t border-zinc-200 dark:border-zinc-800"
            style={{ height: `${hourHeight}px` }}
          >
            {/* Time label */}
            <div className="w-16 flex-shrink-0 pr-2 pt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-500">{time}</span>
            </div>

            {/* Grid area */}
            <div className="flex-1 relative">
              {/* Horizontal line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        )
      })}

      {/* Bottom border */}
      <div className="border-t border-zinc-200 dark:border-zinc-800" />
    </div>
  )
}
