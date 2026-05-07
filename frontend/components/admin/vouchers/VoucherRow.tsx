'use client'

import React, { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate } from '@/lib/utils'
import { type Voucher } from '@/lib/api'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

export function VoucherRow({ v }: { v: Voucher }) {
  const expiryLabel = v.expiresAt
    ? formatDate(v.expiresAt)
    : "Never"

  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors text-sm">
      <td className="px-4 py-3 font-mono font-medium text-foreground tracking-wider whitespace-nowrap">
        {v.code}
        <CopyButton text={v.code} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">{v.planKey}</td>
      <td className="px-4 py-3 text-center text-muted-foreground">
        {v.currentUses} / {v.maxUses}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={v.status} />
      </td>
      <td className="px-4 py-3 text-muted-foreground">{expiryLabel}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {formatDate(v.createdAt)}
      </td>
    </tr>
  )
}
