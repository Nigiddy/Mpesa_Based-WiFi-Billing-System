import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { AlertCircle, Inbox } from 'lucide-react'

interface DataStateWrapperProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  skeletonCount?: number
  skeletonHeight?: string
  children: React.ReactNode
}

/**
 * DataStateWrapper - Consistent loading, error, and empty state handling
 * Wraps any data-displaying component to handle all states
 */
export const DataStateWrapper = React.forwardRef<
  HTMLDivElement,
  DataStateWrapperProps
>(
  (
    {
      loading = false,
      error = null,
      empty = false,
      emptyTitle = 'No data',
      emptyDescription = 'No items to display',
      emptyIcon,
      skeletonCount = 4,
      skeletonHeight = 'h-16',
      children,
    },
    ref
  ) => {
    // Loading state
    if (loading) {
      return (
        <div
          ref={ref}
          className="space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading data"
        >
          {[...Array(skeletonCount)].map((_, i) => (
            <Skeleton key={i} className={`w-full ${skeletonHeight} rounded-lg`} />
          ))}
        </div>
      )
    }

    // Error state
    if (error) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          aria-live="assertive"
        >
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive mb-1">
                    Error Loading Data
                  </h3>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )
    }

    // Empty state
    if (empty) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
          role="status"
          aria-label="No data available"
        >
          <div className="text-5xl mb-4 opacity-50">
            {emptyIcon || <Inbox className="w-12 h-12 mx-auto" />}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {emptyTitle}
          </h3>
          <p className="text-muted-foreground max-w-md">{emptyDescription}</p>
        </motion.div>
      )
    }

    // Success state - render children
    return <div ref={ref}>{children}</div>
  }
)

DataStateWrapper.displayName = 'DataStateWrapper'

export default DataStateWrapper
