'use client'

import React from 'react'
import { CheckCircle } from 'lucide-react'

export interface ProgressStep {
  id: number
  label: string
  status: 'completed' | 'active' | 'pending'
}

export interface ProgressTrackerProps {
  steps: ProgressStep[]
  currentStep?: number
}

export const ProgressTracker = ({ steps, currentStep = 1 }: ProgressTrackerProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active'
          const statusColors = {
            completed: 'bg-success text-white',
            active: 'bg-primary text-white',
            pending: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
          }

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    statusColors[step.status]
                  } ${isActive ? 'ring-4 ring-primary/20 scale-110' : ''}`}
                >
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 bg-slate-200 dark:bg-slate-700 relative z-0">
                  <div
                    className="absolute inset-y-0 left-0 bg-success transition-all duration-500 ease-out w-[var(--progress-width)]"
                    style={{
                      '--progress-width': isCompleted ? '100%' : '0%',
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
