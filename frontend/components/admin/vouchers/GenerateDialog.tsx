'use client'

import React, { useState } from 'react'
import { Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiClient, type Voucher } from '@/lib/api'
import { LABELS } from '@/lib/constants/labels'
import { MESSAGES } from '@/lib/constants/messages'
import { toast } from 'sonner'

export function GenerateDialog({
  onClose,
  onGenerated,
}: {
  onClose: () => void
  onGenerated: (vouchers: Voucher[]) => void
}) {
  const [planKey, setPlanKey] = useState('1Hr')
  const [quantity, setQuantity] = useState(1)
  const [maxUses, setMaxUses] = useState(1)
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await apiClient.generateVouchers({ planKey, quantity, maxUses, expiresInDays })
      if (!res.success || !res.data) throw new Error(res.error || MESSAGES.ERRORS.GENERATE_VOUCHERS)
      toast.success(`${res.data.length} ${MESSAGES.SUCCESS.VOUCHERS_GENERATED}`)
      onGenerated(res.data)
      onClose()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : MESSAGES.ERRORS.GENERATE_VOUCHERS)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Ticket className="w-5 h-5 text-primary" /> Generate Vouchers
        </h2>

        {/* Plan */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {LABELS.PLANS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlanKey(p.key)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  planKey === p.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-xs opacity-70">{p.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Quantity <span className="text-xs">(1–500)</span>
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(Math.min(500, Math.max(1, Number(e.target.value))))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Max Uses */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Max Uses per Code</label>
          <input
            type="number"
            min={1}
            max={100}
            value={maxUses}
            onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Expiry */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Expires in (days)</label>
          <input
            type="number"
            min={1}
            max={365}
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(Math.max(1, Number(e.target.value)))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating…' : `Generate ${quantity}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
