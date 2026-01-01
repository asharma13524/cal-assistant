import type { ViewMode } from '@/lib/types/calendar'

interface CalendarHeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  currentPeriod: string
  onNavigate: (direction: 'prev' | 'next') => void
  onToday: () => void
  onRefresh: () => void
  isLoading: boolean
}

export function CalendarHeader({
  viewMode,
  onViewModeChange,
  currentPeriod,
  onNavigate,
  onToday,
  onRefresh,
  isLoading
}: CalendarHeaderProps) {
  const views: { mode: ViewMode; label: string }[] = [
    { mode: 'day', label: 'Day' },
    { mode: 'week', label: 'Week' },
    { mode: 'month', label: 'Month' },
    { mode: 'year', label: 'Year' },
  ]

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">{currentPeriod}</h1>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="inline-flex bg-stone-100 dark:bg-stone-900 rounded-xl p-1 border border-stone-200/50 dark:border-stone-800/50">
            {views.map((view) => (
              <button
                key={view.mode}
                onClick={() => onViewModeChange(view.mode)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                  viewMode === view.mode
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Today Button */}
          <button
            onClick={onToday}
            className="px-3.5 py-1.5 text-sm font-semibold bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-400 rounded-xl transition-all"
          >
            Today
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh calendar"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate('prev')}
          className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors text-stone-700 dark:text-stone-300"
          aria-label="Previous"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onNavigate('next')}
          className="p-2.5 hover:bg-stone-100 dark:hover:bg-stone-900 rounded-xl transition-colors text-stone-700 dark:text-stone-300"
          aria-label="Next"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
