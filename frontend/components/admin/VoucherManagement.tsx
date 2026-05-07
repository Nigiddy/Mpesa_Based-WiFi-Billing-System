"use client"

import { useState, useEffect, useCallback } from "react"
import { Ticket, Plus, Download, RefreshCw, Copy, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient, type Voucher } from "@/lib/api"
import { LABELS } from "@/lib/constants/labels"
import { MESSAGES } from "@/lib/constants/messages"
import { toast } from "sonner"
import { GenerateDialog } from "./vouchers/GenerateDialog"
import { VoucherRow } from "./vouchers/VoucherRow"

// ─── Types ────────────────────────────────────────────────────────────────────

type VoucherStatus = "all" | "unused" | "active" | "fully_used" | "expired"

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
        toast.error(res.error || MESSAGES.ERRORS.FETCH_VOUCHERS)
      }
    } catch (err) {
      toast.error(MESSAGES.ERRORS.FETCH_VOUCHERS)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    let cancelled = false
    fetchVouchers().catch(() => {
      if (!cancelled) toast.error(MESSAGES.ERRORS.FETCH_VOUCHERS)
    })
    return () => { cancelled = true }
  }, [fetchVouchers])

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
