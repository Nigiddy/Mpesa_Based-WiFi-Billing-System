'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Stat Card with Trend Indicator
 */
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
            {/* Left side - Label & Value */}
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

              {/* Trend indicator */}
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

            {/* Right side - Icon */}
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

/**
 * Stats Grid - Display multiple stat cards
 */
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

/**
 * Activity Feed Item
 */
export interface ActivityItem {
  id: string
  type: 'payment' | 'connection' | 'warning' | 'system'
  title: string
  description: string
  timestamp: string
  icon: React.ReactNode
  status?: 'success' | 'pending' | 'warning' | 'error'
}

const ActivityStatusColor = {
  success: 'bg-success/10 border-success/30 text-success',
  pending: 'bg-warning/10 border-warning/30 text-warning',
  warning: 'bg-warning/10 border-warning/30 text-warning',
  error: 'bg-destructive/10 border-destructive/30 text-destructive',
}

export const ActivityFeedItem = ({
  title,
  description,
  timestamp,
  icon,
  status = 'success',
}: ActivityItem) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        'p-4 rounded-lg border transition-colors',
        ActivityStatusColor[status]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs opacity-75 mt-0.5">{description}</p>
          <p className="text-xs opacity-60 mt-1">{timestamp}</p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Real-time Activity Feed
 */
export const RealtimeActivityFeed = ({
  activities,
  isLive = true,
}: {
  activities: ActivityItem[]
  isLive?: boolean
}) => {
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>📊 Live Activity Feed</CardTitle>
          {isLive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 text-xs font-semibold text-success"
            >
              <div className="w-2 h-2 rounded-full bg-success" />
              LIVE
            </motion.div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No recent activity
            </p>
          ) : (
            activities.map((activity) => (
              <ActivityFeedItem key={activity.id} {...activity} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * KPI Summary Card - Quick overview
 */
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

/**
 * Data Table Row Component (for payment table)
 */
export const TableRowHighlight = ({
  children,
  status,
}: {
  children: React.ReactNode
  status?: 'success' | 'pending' | 'failed'
}) => {
  const bgColor = {
    success: 'hover:bg-success/5 dark:hover:bg-success/10 border-l-4 border-success/50',
    pending: 'hover:bg-warning/5 dark:hover:bg-warning/10 border-l-4 border-warning/50',
    failed: 'hover:bg-destructive/5 dark:hover:bg-destructive/10 border-l-4 border-destructive/50',
  }

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'transition-colors border-b',
        status && bgColor[status]
      )}
    >
      {children}
    </motion.tr>
  )
}

/**
 * Empty State Component
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="text-5xl mb-4 opacity-50">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  )
}

/**
 * Loading Skeleton Cards
 */
export const SkeletonStatCard = () => {
  return (
    <Card variant="default">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

export const SkeletonStatCards = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  )
}

export default {
  PremiumStatCard,
  StatCardsGrid,
  ActivityFeedItem,
  RealtimeActivityFeed,
  KPISummary,
  TableRowHighlight,
  EmptyState,
  SkeletonStatCard,
  SkeletonStatCards,
}
