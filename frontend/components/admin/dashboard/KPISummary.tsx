'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export const KPISummary = ({
  title,
  value,
  valueUnit = '',
  subtitle,
  change,
  icon,
  highlighted = false,
}: {
  title: string
  value: string | number
  valueUnit?: string
  subtitle?: string
  change?: number
  icon?: React.ReactNode
  highlighted?: boolean
}) => {
  return (
    <Card
      variant={highlighted ? 'interactive' : 'default'}
      className={cn(
        highlighted && 'border-primary/50 bg-primary/5',
        'text-center'
      )}
    >
      <CardContent className="pt-6">
        {icon && (
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          </div>
        )}
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="mt-2 mb-2">
          <span className="text-3xl font-bold text-foreground">{value}</span>
          {valueUnit && <span className="text-muted-foreground ml-1">{valueUnit}</span>}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {change !== undefined && (
          <p className={cn(
            'text-xs font-semibold mt-2',
            change >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {change >= 0 ? '+' : ''}{change}% vs yesterday
          </p>
        )}
      </CardContent>
    </Card>
  )
}
