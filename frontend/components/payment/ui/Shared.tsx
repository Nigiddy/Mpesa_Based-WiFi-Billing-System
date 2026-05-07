'use client'

import React from 'react'
import { Lock, Shield, AlertCircle } from 'lucide-react'

export const SecurityBadges = () => {
  return (
    <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-border/40">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" />
        <span>End-to-End Encrypted</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5 text-success" />
        <span>Safaricom Secured</span>
      </div>
    </div>
  )
}

export const HelpText = ({
  icon,
  text,
}: {
  icon?: React.ReactNode | string
  text: string
}) => {
  return (
    <div className="flex gap-3 items-start p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg mt-4 border border-slate-100 dark:border-slate-800">
      <div className="text-muted-foreground pt-0.5">
        {typeof icon === 'string' ? (
          <span className="text-lg leading-none">{icon}</span>
        ) : (
          icon || <AlertCircle className="w-4 h-4" />
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  )
}
