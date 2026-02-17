/**
 * Premium Payment UI Components
 * Specialized components for payment flows
 */

import React from 'react'
import { CheckCircle, AlertCircle, Clock, XCircle, Shield, Lock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Status Card - Displays transaction status with icon and styling
 */
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

/**
 * Progress Tracker - Shows payment flow steps
 */
export interface ProgressStep {
  id: number
  label: string
  status: 'completed' | 'active' | 'pending'
}

export interface ProgressTrackerProps {
  steps: ProgressStep[]
  currentStep?: number
}

export const ProgressTracker = ({ steps, currentStep = 1 }: ProgressTrackerProps) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed'
          const isActive = step.status === 'active'
          const statusColors = {
            completed: 'bg-success text-white',
            active: 'bg-primary text-white',
            pending: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
          }

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300',
                    statusColors[step.status],
                    isActive && 'ring-4 ring-primary/30'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <p className="text-xs font-medium mt-2 text-center w-full">{step.label}</p>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2 transition-all duration-300',
                    isCompleted ? 'bg-success' : 'bg-slate-200 dark:bg-slate-700'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Confidence Signal - Trust indicator component
 */
export interface ConfidenceSignalProps {
  icon: React.ReactNode
  text: string
  subtext?: string
}

export const ConfidenceSignal = ({ icon, text, subtext }: ConfidenceSignalProps) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
      <div className="text-success">{icon}</div>
      <div>
        <p className="text-sm font-medium text-success">{text}</p>
        {subtext && <p className="text-xs text-success/70">{subtext}</p>}
      </div>
    </div>
  )
}

/**
 * Confidence Grid - Multiple trust signals
 */
export const ConfidenceGrid = ({
  signals,
}: {
  signals: { icon: React.ReactNode; text: string; subtext?: string }[]
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {signals.map((signal, index) => (
        <ConfidenceSignal key={index} {...signal} />
      ))}
    </div>
  )
}

/**
 * Amount Display - Premium currency display
 */
export const AmountDisplay = ({
  amount,
  currency = 'KSh',
  size = 'lg',
}: {
  amount: number
  currency?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
    xl: 'text-5xl',
  }

  return (
    <div className={cn('font-bold text-primary', sizeClasses[size])}>
      {currency} <span className="text-primary">{amount.toLocaleString()}</span>
    </div>
  )
}

/**
 * Transaction Details Display
 */
export interface TransactionDetails {
  transactionId: string
  amount: number
  package: string
  duration: string
  phone: string
  mpesaRef?: string
  wifiPassword?: string
  expiresAt?: string
}

export const TransactionDetailsPanel = ({ details }: { details: TransactionDetails }) => {
  const rows = [
    { label: 'Transaction ID', value: details.transactionId, copyable: true },
    { label: 'Amount', value: `KSh ${details.amount.toLocaleString()}` },
    { label: 'Package', value: details.package },
    { label: 'Duration', value: details.duration },
    { label: 'Phone', value: details.phone },
    ...(details.mpesaRef ? [{ label: 'M-Pesa Ref', value: details.mpesaRef, copyable: true }] : []),
    ...(details.wifiPassword ? [{ label: 'WiFi Password', value: details.wifiPassword, copyable: true }] : []),
    ...(details.expiresAt ? [{ label: 'Expires', value: details.expiresAt }] : []),
  ]

  return (
    <Card variant="glass">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={index} className="flex justify-between items-center pb-3 border-b border-border/50 last:border-0 last:pb-0">
              <span className="text-sm font-medium text-muted-foreground">{row.label}</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground">{row.value}</code>
                {row.copyable && (
                  <button
                    onClick={() => navigator.clipboard.writeText(row.value)}
                    className="text-primary hover:text-primary/80 transition-colors"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Countdown Timer - Shows expiring prompt
 */
export const CountdownTimer = ({ expiresIn, onExpire }: { expiresIn: number; onExpire?: () => void }) => {
  const [seconds, setSeconds] = React.useState(expiresIn)

  React.useEffect(() => {
    if (seconds <= 0) {
      onExpire?.()
      return
    }

    const timer = setInterval(() => {
      setSeconds((s) => s - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [seconds, onExpire])

  const isWarning = seconds < 60
  const isCritical = seconds < 30

  return (
    <div
      className={cn(
        'text-center py-3 rounded-lg transition-colors duration-300',
        isCritical ? 'bg-destructive/10 text-destructive' : isWarning ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
      )}
    >
      <p className="text-sm font-medium">
        ⏱️  Prompt expires in: <span className="font-bold">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      </p>
      <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-1000',
            isCritical ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-success'
          )}
          style={{ width: `${(seconds / expiresIn) * 100}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Help Text - Inline help with icon
 */
export const HelpText = ({ text, icon = '💡' }: { text: string; icon?: string }) => {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
      <span className="text-lg">{icon}</span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/**
 * Security Badges Grid
 */
export const SecurityBadges = () => {
  const badges = [
    { icon: <Lock className="w-4 h-4" />, text: '256-bit SSL Encrypted' },
    { icon: <Shield className="w-4 h-4" />, text: 'PCI DSS Compliant' },
    { icon: <CheckCircle className="w-4 h-4" />, text: 'M-Pesa Verified' },
  ]

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {badges.map((badge, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium"
        >
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  )
}
