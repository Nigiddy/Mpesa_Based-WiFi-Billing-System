'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
          <CardTitle> Live Activity Feed</CardTitle>
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
