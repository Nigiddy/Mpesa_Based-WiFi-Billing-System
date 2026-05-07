'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StatCardData {
  icon: React.ReactNode
  label: string
  value: string | number
  change: number
  period: string
  trend: 'up' | 'down' | 'neutral'
  gradient?: string
  animated?: boolean
}

export const PremiumStatCard = ({
  icon,
  label,
  value,
  change,
  period,
  trend = 'neutral',
  gradient = 'from-primary/20 to-secondary/20',
  animated = true,
}: StatCardData) => {
  const trendColor = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  }

  const backgroundColor = {
    up: 'bg-success/10',
    down: 'bg-destructive/10',
    neutral: 'bg-slate-100 dark:bg-slate-800',
  }

  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        variant="elevated"
        className={cn(
          'overflow-hidden',
          trend === 'up' && 'hover:border-success/50',
          trend === 'down' && 'hover:border-destructive/50'
        )}
      >
        <div className={cn('h-2 bg-gradient-to-r', gradient)} />

        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className="flex items-baseline gap-2">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                  className="text-2xl lg:text-3xl font-bold text-foreground"
                >
                  {value}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold',
                  trendColor[trend]
                )}
              >
                <TrendIcon className="w-3 h-3" />
                <span>
                  {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{Math.abs(change)}%
                </span>
                <span className="text-muted-foreground font-normal">{period}</span>
              </motion.div>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={cn(
                'p-3 rounded-lg',
                backgroundColor[trend]
              )}
            >
              <div className={cn(
                'w-6 h-6',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-primary'
              )}>
                {icon}
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const StatCardsGrid = ({
  stats,
}: {
  stats: StatCardData[]
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          <PremiumStatCard {...stat} />
        </motion.div>
      ))}
    </div>
  )
}
