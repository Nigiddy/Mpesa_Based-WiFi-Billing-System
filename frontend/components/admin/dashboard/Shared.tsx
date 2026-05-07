'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
