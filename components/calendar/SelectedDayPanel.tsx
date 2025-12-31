import type { CalendarEvent } from '@/lib/types/calendar'
import { EventCard } from './EventCard'

interface SelectedDayPanelProps {
  selectedDate: { month: string; day: number } | null
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onAddEvent?: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function SelectedDayPanel({
  selectedDate,
  events,
  onEventClick,
  onAddEvent,
  isCollapsed,
  onToggleCollapse
}: SelectedDayPanelProps) {
  if (isCollapsed) {
    return (
      <div className="lg:col-span-1">
        <button
          onClick={onToggleCollapse}
          className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-3 w-full hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors sticky top-6"
          aria-label="Expand panel"
        >
          <svg className="w-5 h-5 mx-auto text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="lg:col-span-1">
      <div className="bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-4 sticky top-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {selectedDate ? (
              <>
                {selectedDate.month} {selectedDate.day}
                <span className="font-normal text-zinc-500 dark:text-zinc-400 ml-2 text-sm">
                  {events.length} event{events.length !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              'Select a date'
            )}
          </h2>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
            aria-label="Collapse panel"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {onAddEvent && selectedDate && (
          <button
            onClick={onAddEvent}
            className="w-full mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Event
          </button>
        )}

        {selectedDate ? (
          events.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                  showColor
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500 dark:text-zinc-500">
              <svg className="w-8 h-8 mb-2 text-zinc-400 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">No events</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-1">
                Use the chat to schedule something
              </p>
            </div>
          )
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Click on a date to view events
          </p>
        )}
      </div>
    </div>
  )
}
