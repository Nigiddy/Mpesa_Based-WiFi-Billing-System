'use client'

import React from 'react'
import { CheckCircle, Zap, Shield } from 'lucide-react'

export const ConfidenceGrid = () => {
  const points = [
    { icon: <Zap className="w-4 h-4 text-primary" />, text: "Instant connection" },
    { icon: <Shield className="w-4 h-4 text-success" />, text: "Secure payment" },
    { icon: <CheckCircle className="w-4 h-4 text-blue-500" />, text: "No hidden fees" },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 py-4">
      {points.map((point, i) => (
        <div key={i} className="flex flex-col items-center justify-center text-center space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          {point.icon}
          <span className="text-[10px] font-medium text-muted-foreground leading-tight">
            {point.text}
          </span>
        </div>
      ))}
    </div>
  )
}
