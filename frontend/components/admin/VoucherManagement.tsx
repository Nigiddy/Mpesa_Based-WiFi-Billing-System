"use client"

import { useState, useEffect, useCallback } from "react"
import { Ticket, Plus, Download, RefreshCw, Copy, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataStateWrapper } from "@/components/ui/data-state"
import { apiClient, type Voucher } from "@/lib/api"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

type VoucherStatus = "all" | "unused" | "active" | "fully_used" | "expired"

const PLAN_OPTIONS = [
  { key: "1Hr",   label: "1 Hour",   price: "KSh 10" },
  { key: "4Hrs",  label: "4 Hours",  price: "KSh 15" },
  { key: "12Hrs", label: "12 Hours", price: "KSh 20" },
  { key: "24Hrs", label: "24 Hours", price: "KSh 30" },
]

// ─── Generate Dialog ──────────────────────────────────────────────────────────

function GenerateDialog({
  onClose,
  onGenerated,
}: {
  onClose: () => void
  onGenerated: (vouchers: Voucher[]) => void
}) {
  const [planKey, setPlanKey]             = useState("1Hr")
  const [quantity, setQuantity]           = useState(1)
  const [maxUses, setMaxUses]             = useState(1)
  const [expiresInDays, setExpiresInDays] = useState(30)
  const [loading, setLoading]             = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await apiClient.generateVouchers({ planKey, quantity, maxUses, expiresInDays })
      if (!res.success || !res.data) throw new Error(res.error || "Generation failed")
      toast.success(`${res.data.length} voucher(s) generated`)
      onGenerated(res.data)
      onClose()
    } catch (e: any) {
      toast.error(e.message || "Failed to generate vouchers")
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
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPlanKey(p.key)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  planKey === p.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
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
            {loading ? "Generating…" : `Generate ${quantity}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

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

// ─── Voucher Row ──────────────────────────────────────────────────────────────

function VoucherRow({ v }: { v: Voucher }) {
  const expiryLabel = v.expiresAt
    ? new Date(v.expiresAt).toLocaleDateString()
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
        {new Date(v.createdAt).toLocaleDateString()}
      </td>
    </tr>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VoucherManagement() {
  const [vouchers, setVouchers]       = useState<Voucher[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [statusFilter, setStatusFilter] = useState<VoucherStatus>("all")
  const [loading, setLoading]         = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)

  const fetchVouchers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: 50,
        ...(statusFilter !== "all" ? { status: statusFilter as Exclude<VoucherStatus, "all"> } : {}),
      }
      const res = await apiClient.getVouchers(params)
      if (res.success && res.data) {
        setVouchers(res.data.vouchers)
        setTotal(res.data.total)
        setTotalPages(res.data.totalPages)
      } else {
        toast.error(res.error || "Failed to load vouchers")
      }
    } catch {
      toast.error("Failed to load vouchers")
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchVouchers() }, [fetchVouchers])

  // Summary counts
  const counts = {
    unused:     vouchers.filter((v) => v.status === "unused").length,
    active:     vouchers.filter((v) => v.status === "active").length,
    fully_used: vouchers.filter((v) => v.status === "fully_used").length,
    expired:    vouchers.filter((v) => v.status === "expired").length,
  }

  const FILTERS: { value: VoucherStatus; label: string }[] = [
    { value: "all",        label: "All" },
    { value: "unused",     label: "Unused" },
    { value: "active",     label: "Active" },
    { value: "fully_used", label: "Used" },
    { value: "expired",    label: "Expired" },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" /> Voucher Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} voucher{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchVouchers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => apiClient.exportVouchersCSV()} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowGenerate(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Generate
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Unused",  value: counts.unused,     color: "text-primary" },
          { label: "Active",  value: counts.active,     color: "text-success" },
          { label: "Used",    value: counts.fully_used, color: "text-muted-foreground" },
          { label: "Expired", value: counts.expired,    color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        <Filter className="w-3.5 h-3.5 text-muted-foreground ml-2" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                {["Code", "Plan", "Uses", "Status", "Expires", "Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No vouchers found. Generate some to get started.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => <VoucherRow key={v.id} v={v} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Generate Dialog */}
      {showGenerate && (
        <GenerateDialog
          onClose={() => setShowGenerate(false)}
          onGenerated={(newVouchers) => {
            setVouchers((prev) => [...newVouchers, ...prev])
            setTotal((t) => t + newVouchers.length)
          }}
        />
      )}
    </div>
  )
}
