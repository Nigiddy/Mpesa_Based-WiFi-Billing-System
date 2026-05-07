'use client'

import React from 'react'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

export interface StatusCardProps {
  status: 'success' | 'pending' | 'failed' | 'processing'
  title: string
  message?: string
  subtext?: string
  icon?: React.ReactNode
  animated?: boolean
}

export const StatusCard = ({
  status,
  title,
  message,
  subtext,
  icon,
  animated = false,
}: StatusCardProps) => {
  const statusConfig = {
    success: {
      bg: 'bg-success/10',
      border: 'border-success/30',
      icon: <CheckCircle className="w-5 h-5 text-success animate-checkmark" />,
      textColor: 'text-success',
    },
    pending: {
      bg: 'bg-warning/10',
      border: 'border-warning/30',
      icon: <Clock className="w-5 h-5 text-warning animate-pulse" />,
      textColor: 'text-warning',
    },
    failed: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/30',
      icon: <XCircle className="w-5 h-5 text-destructive animate-shake" />,
      textColor: 'text-destructive',
    },
    processing: {
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      icon: <Clock className="w-5 h-5 text-primary animate-spin" />,
      textColor: 'text-primary',
    },
  }

  const config = statusConfig[status]

  return (
    <Card variant="interactive" className={cn(config.bg, config.border)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {icon || config.icon}
          <div className="flex-1">
            <h3 className={cn('font-semibold', config.textColor)}>{title}</h3>
            {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
            {subtext && <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
