'use client'

import React, { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export interface CountdownTimerProps {
  initialSeconds: number
  onComplete?: () => void
  dangerThreshold?: number
}

export const CountdownTimer = ({
  initialSeconds,
  onComplete,
  dangerThreshold = 30,
}: CountdownTimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    if (seconds <= 0) {
      onComplete?.()
      return
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [seconds, onComplete])

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const isDanger = seconds <= dangerThreshold

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center gap-2 text-2xl font-mono font-bold ${
          isDanger ? 'text-destructive animate-pulse' : 'text-primary'
        }`}
      >
        <Clock className={`w-6 h-6 ${isDanger ? 'animate-bounce' : ''}`} />
        <span>{mins.toString().padStart(2, '0')}</span>:
        <span>{secs.toString().padStart(2, '0')}</span>
      </div>
      
      <div className="w-full max-w-[200px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear w-[var(--progress-width)] ${
            isDanger ? 'bg-destructive' : 'bg-primary'
          }`}
          style={{ '--progress-width': `${(seconds / initialSeconds) * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
