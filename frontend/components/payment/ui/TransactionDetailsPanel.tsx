'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface TransactionDetails {
  transactionId: string
  amount: number
  package: string
  duration: string
  phone: string
  mpesaRef: string
  wifiPassword?: string
  expiresAt?: string
}

export const TransactionDetailsPanel = ({ details }: { details: TransactionDetails }) => {
  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="bg-slate-100 dark:bg-slate-800/50 px-4 py-3 border-b border-border/50">
        <h4 className="font-semibold text-sm">Transaction Details</h4>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          <DetailRow label="Amount" value={formatCurrency(details.amount)} highlight />
          <DetailRow label="Package" value={details.package} />
          <DetailRow label="Duration" value={details.duration} />
          <DetailRow label="M-Pesa Ref" value={details.mpesaRef} monospace />
          {details.wifiPassword && (
            <DetailRow label="WiFi Password" value={details.wifiPassword} copyable monospace />
          )}
          {details.expiresAt && (
            <DetailRow
              label="Expires"
              value={formatDate(details.expiresAt)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  highlight = false,
  monospace = false,
  copyable = false,
}: {
  label: string
  value: string | number
  highlight?: boolean
  monospace?: boolean
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!copyable) return
    navigator.clipboard.writeText(value.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`
            ${highlight ? 'font-bold text-primary text-base' : 'font-medium'}
            ${monospace ? 'font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded' : ''}
          `}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-xs text-primary hover:underline px-2 py-1 bg-primary/10 rounded-md transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}
