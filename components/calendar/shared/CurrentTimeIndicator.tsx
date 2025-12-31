'use client'

import { useEffect, useState } from 'react'
import { getCurrentTimePosition, isCurrentTimeVisible } from '@/lib/utils/calendar'

interface CurrentTimeIndicatorProps {
  startHour: number
  hourHeight: number
  leftOffset?: number // Offset from left in pixels (for time label column)
}

export function CurrentTimeIndicator({ startHour, hourHeight, leftOffset = 64 }: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(() => getCurrentTimePosition(startHour, hourHeight))
  const [isVisible, setIsVisible] = useState(() => isCurrentTimeVisible(startHour, startHour + 16))

  useEffect(() => {
    // Update position every minute
    const updatePosition = () => {
      setPosition(getCurrentTimePosition(startHour, hourHeight))
      setIsVisible(isCurrentTimeVisible(startHour, startHour + 16))
    }

    const interval = setInterval(updatePosition, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [startHour, hourHeight])

  if (!isVisible) return null

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        top: `${position}px`,
        left: `${leftOffset}px`,
        right: 0,
      }}
    >
      {/* Red circle */}
      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500 dark:bg-red-400" />
      {/* Red line */}
      <div className="h-0.5 bg-red-500 dark:bg-red-400" />
    </div>
  )
}
