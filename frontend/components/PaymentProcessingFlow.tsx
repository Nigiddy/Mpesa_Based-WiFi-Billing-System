'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ProgressTracker,
  StatusCard,
  ConfidenceGrid,
  TransactionDetailsPanel,
  CountdownTimer,
  SecurityBadges,
  HelpText,
} from '@/components/PaymentUIComponents'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import confetti from 'canvas-confetti'

/**
 * Payment Processing Flow Component
 * Handles STK push, polling, and result states
 */

export type PaymentStage = 'initializing' | 'stk_sent' | 'waiting' | 'success' | 'failed' | 'timeout'

export interface PaymentProcessingProps {
  stage: PaymentStage
  amount: number
  phone: string
  package: string
  duration: string
  transactionId?: string
  mpesaRef?: string
  wifiPassword?: string
  expiresAt?: string
  stkExpiresIn?: number

  // Callbacks
  onRetry?: () => void
  onCancel?: () => void
  onSuccess?: () => void
  onFailed?: () => void
  onTimeout?: () => void
  onResend?: () => void
}

export const PaymentProcessingFlow = ({
  stage,
  amount,
  phone,
  package: packageName,
  duration,
  transactionId,
  mpesaRef,
  wifiPassword,
  expiresAt,
  stkExpiresIn = 180,
  onRetry,
  onCancel,
  onSuccess,
  onFailed,
  onTimeout,
  onResend,
}: PaymentProcessingProps) => {
  const [localExpiresIn, setLocalExpiresIn] = useState(stkExpiresIn)
  const [isResending, setIsResending] = useState(false)

  // STK countdown
  useEffect(() => {
    if (stage !== 'stk_sent' && stage !== 'waiting') return

    const timer = setInterval(() => {
      setLocalExpiresIn((s) => {
        if (s <= 1) {
          onTimeout?.()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, onTimeout])

  const handleResend = async () => {
    setIsResending(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API call
      setLocalExpiresIn(stkExpiresIn)
      onResend?.()
    } finally {
      setIsResending(false)
    }
  }

  // Success confetti
  useEffect(() => {
    if (stage === 'success') {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }, [stage])

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {stage === 'initializing' && (
          <motion.div
            key="initializing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="processing">
              <CardContent className="pt-8 pb-8">
                <div className="text-center space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 animate-pulse">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Initializing Payment</h3>
                    <p className="text-sm text-muted-foreground mt-1">Setting up your M-Pesa transaction...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {(stage === 'stk_sent' || stage === 'waiting') && (
          <motion.div
            key="stk"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Progress */}
            <ProgressTracker
              steps={[
                { id: 1, label: 'Verified', status: 'completed' },
                { id: 2, label: 'Sending', status: 'active' },
                { id: 3, label: 'Confirm', status: 'pending' },
              ]}
            />

            {/* Main Card */}
            <Card variant="elevated" className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
                <CardTitle className="text-center">📱 Your M-Pesa Prompt is Ready</CardTitle>
              </CardHeader>
              <CardContent className="pt-8">
                <div className="space-y-6">
                  {/* Message */}
                  <div className="text-center">
                    <p className="text-muted-foreground">
                      Enter your <strong>M-Pesa PIN</strong> on your phone to complete the payment
                    </p>
                  </div>

                  {/* Details Box */}
                  <Card variant="glass" className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-bold text-primary">KSh {amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Package</span>
                      <span className="font-medium">{packageName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-medium">{duration}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <code className="text-sm font-mono">{phone}</code>
                    </div>
                  </Card>

                  {/* Countdown */}
                  <div className="bg-amber-900/10 border border-amber-900/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Prompt Expiration</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        {Math.floor(localExpiresIn / 60)}:{String(localExpiresIn % 60).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                        initial={{ width: '100%' }}
                        animate={{ width: `${(localExpiresIn / stkExpiresIn) * 100}%` }}
                        transition={{ duration: 1, ease: 'linear' }}
                      />
                    </div>
                  </div>

                  {/* Help text */}
                  {localExpiresIn > 20 && (
                    <HelpText text="You'll receive a notification on your phone. Open the M-Pesa prompt and enter your PIN to proceed." />
                  )}

                  {localExpiresIn < 30 && (
                    <HelpText
                      icon="⚠️"
                      text="Prompt is expiring soon. If you don't see it, please request a new one or check your phone's notifications."
                    />
                  )}

                  {/* Actions */}
                  <div className="space-y-3 pt-4">
                    <Button
                      variant="premium"
                      size="lg"
                      fullWidth
                      disabled={isResending || localExpiresIn <= 0}
                      onClick={handleResend}
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resending...
                        </>
                      ) : (
                        <>
                          📱 Haven't Received? Resend
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="lg"
                      fullWidth
                      onClick={onCancel}
                      disabled={isResending}
                    >
                      Cancel Payment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <SecurityBadges />
          </motion.div>
        )}

        {stage === 'success' && transactionId && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="space-y-6"
          >
            {/* Success Header */}
            <Card variant="success" className="overflow-hidden">
              <div className="bg-gradient-to-r from-success to-success/80 text-white p-8 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">🎉 Payment Successful!</h2>
                <p className="text-success-100">You're now connected to the internet</p>
              </div>

              <CardContent className="pt-8">
                <div className="space-y-6">
                  {/* Transaction Details */}
                  <TransactionDetailsPanel
                    details={{
                      transactionId,
                      amount,
                      package: packageName,
                      duration,
                      phone,
                      mpesaRef,
                      wifiPassword,
                      expiresAt,
                    }}
                  />

                  {/* What's Next */}
                  <Card variant="glass">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">📌 What's Next?</h4>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-success">✓</span>
                          <span>Refresh your device or reconnect to WiFi</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success">✓</span>
                          <span>WiFi "{packageName}" appears in available networks</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success">✓</span>
                          <span>Enter the WiFi password from above</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success">✓</span>
                          <span>Enjoy high-speed internet!</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="space-y-3 pt-4">
                    <Button variant="premium" size="lg" fullWidth>
                      ✨ View Dashboard
                    </Button>
                    <Button variant="outline" size="lg" fullWidth>
                      🏠 Back Home
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SecurityBadges />
          </motion.div>
        )}

        {stage === 'failed' && (
          <motion.div
            key="failed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            <Card variant="error" className="overflow-hidden">
              <div className="bg-gradient-to-r from-destructive to-destructive/80 text-white p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4"
                >
                  <XCircle className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">❌ Payment Failed</h2>
                <p className="text-red-100">Please try again or contact support</p>
              </div>

              <CardContent className="pt-8">
                <div className="space-y-6">
                  <StatusCard
                    status="failed"
                    title="Insufficient Balance"
                    message="Your M-Pesa account doesn't have enough balance to complete this transaction."
                    subtext="Please load more credit and try again"
                  />

                  <Card variant="glass">
                    <CardContent className="pt-6">
                      <h4 className="font-semibold mb-3">💡 What You Can Do</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Load more airtime or M-Pesa balance</li>
                        <li>• Try a smaller package</li>
                        <li>• Contact customer support</li>
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="space-y-3 pt-4">
                    <Button
                      variant="premium"
                      size="lg"
                      fullWidth
                      onClick={onRetry}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="outline" size="lg" fullWidth onClick={onCancel}>
                      💬 Contact Support
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stage === 'timeout' && (
          <motion.div
            key="timeout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <StatusCard
              status="failed"
              title="⏱️ Prompt Expired"
              message="Your M-Pesa prompt has expired. The transaction was cancelled."
              subtext="You can request a new prompt to complete the payment."
            />

            <div className="space-y-3">
              <Button variant="premium" size="lg" fullWidth onClick={onRetry}>
                🔄 Request New Prompt
              </Button>
              <Button variant="outline" size="lg" fullWidth onClick={onCancel}>
                🏠 Go Home
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PaymentProcessingFlow
