/**
 * Color Token Mappings
 * Maps semantic status colors to design system tokens
 * Single source of truth for status-based colors
 */

import { colors } from './design-tokens'

export const statusColorMap = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/30',
    icon: 'text-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/30',
    icon: 'text-warning',
  },
  error: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/30',
    icon: 'text-destructive',
  },
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/30',
    icon: 'text-primary',
  },
} as const

// Status type mappings
export const statusToColorToken = {
  // Transaction/Payment statuses
  completed: 'success',
  success: 'success',
  pending: 'warning',
  processing: 'primary',
  failed: 'error',
  refunded: 'primary',

  // User statuses
  active: 'success',
  expired: 'warning',
  blocked: 'error',

  // Voucher statuses
  unused: 'primary',
  'fully_used': 'warning',

  // Payment flow stages
  stk_sent: 'primary',
  waiting: 'primary',
  timeout: 'warning',
} as const

export type StatusType = keyof typeof statusToColorToken
export type ColorToken = typeof statusColorMap[keyof typeof statusColorMap]

/**
 * Get color classes for a status
 * @param status The status type (e.g., 'completed', 'pending', 'failed')
 * @returns Object with Tailwind classes for bg, text, border, icon
 */
export function getStatusColorClasses(status: string): ColorToken {
  const colorTokenKey = statusToColorToken[status as StatusType] || 'warning'
  return statusColorMap[colorTokenKey]
}

/**
 * Get label text for a status
 */
export const statusLabels: Record<string, string> = {
  completed: 'Completed',
  success: 'Success',
  pending: 'Pending',
  processing: 'Processing',
  failed: 'Failed',
  refunded: 'Refunded',
  active: 'Active',
  expired: 'Expired',
  blocked: 'Blocked',
  unused: 'Unused',
  fully_used: 'Used',
}

/**
 * Get display label for a status
 */
export function getStatusLabel(status: string): string {
  return statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)
}
