import React from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  LucideIcon 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColorClasses, getStatusLabel, type StatusType } from '@/lib/color-tokens'

export interface StatusBadgeProps {
  status: string
  showIcon?: boolean
  className?: string
  variant?: 'default' | 'outline' | 'secondary'
}

// Icon map for statuses
const statusIconMap: Record<string, LucideIcon | null> = {
  completed: CheckCircle,
  success: CheckCircle,
  pending: Clock,
  processing: Clock,
  failed: XCircle,
  refunded: RefreshCw,
  active: CheckCircle,
  expired: Clock,
  blocked: XCircle,
  unused: Clock,
  fully_used: CheckCircle,
}

/**
 * StatusBadge - Reusable badge component for displaying status with icon and color
 * Single source of truth for all status badges across the app
 */
export const StatusBadge = React.forwardRef<
  HTMLDivElement,
  StatusBadgeProps
>(({ status, showIcon = true, className, variant = 'default' }, ref) => {
  const colors = getStatusColorClasses(status)
  const label = getStatusLabel(status)
  const Icon = statusIconMap[status]

  return (
    <Badge
      ref={ref}
      className={cn(
        'flex items-center gap-1.5 border',
        colors.bg,
        colors.text,
        colors.border,
        'dark:' + colors.bg,
        'dark:' + colors.text,
        className
      )}
      variant={variant}
    >
      {showIcon && Icon && (
        <Icon className={cn('h-3 w-3', colors.icon)} aria-hidden="true" />
      )}
      <span>{label}</span>
    </Badge>
  )
})

StatusBadge.displayName = 'StatusBadge'

export default StatusBadge
