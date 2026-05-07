'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  InitializingView,
  StkSentView,
  SuccessView,
  FailedView,
  TimeoutView,
} from './payment/views/PaymentViews'

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

export const PaymentProcessingFlow = (props: PaymentProcessingProps) => {
  const { stage, stkExpiresIn = 180, onTimeout, onResend } = props
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
        {stage === 'initializing' && <InitializingView />}

        {(stage === 'stk_sent' || stage === 'waiting') && (
          <StkSentView
            {...props}
            localExpiresIn={localExpiresIn}
            isResending={isResending}
            handleResend={handleResend}
          />
        )}

        {stage === 'success' && props.transactionId && <SuccessView {...props} />}

        {stage === 'failed' && <FailedView onRetry={props.onRetry} onCancel={props.onCancel} />}

        {stage === 'timeout' && <TimeoutView onRetry={props.onRetry} onCancel={props.onCancel} />}
      </AnimatePresence>
    </div>
  )
}
