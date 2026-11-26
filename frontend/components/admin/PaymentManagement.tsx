"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { CreditCard, Download, Eye, Loader2, MoreHorizontal, RotateCcw, Search, SearchX, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { apiClient, type Transaction } from "@/lib/api"
import { MESSAGES } from "@/lib/constants/messages"
import { cn } from "@/lib/utils"
import {
  CopyValue, EmptyState, ErrorState, FAINT, FilterChips, ListSkeleton, PageHeader, Pagination, Panel, StatusPill,
  formatKsh, formatPhone, formatWhen, type Tone,
} from "./admin-ui"

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

type StatusFilter = "all" | "completed" | "pending" | "failed" | "refunded"

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "completed", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

const STATUS: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  completed: { label: "Paid", tone: "success" },
  pending: { label: "Pending", tone: "warning", pulse: true },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "neutral" },
  timeout: { label: "Timed out", tone: "neutral" },
}

const statusOf = (status: string) =>
  STATUS[status] ?? {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown",
    tone: "neutral" as Tone,
  }

const PaymentStatus = ({ status }: { status: string }) => {
  const s = statusOf(status)
  return <StatusPill tone={s.tone} pulse={s.pulse}>{s.label}</StatusPill>
}

const HEAD = cn("h-10 text-xs font-medium", FAINT)

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const PaymentManagement = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("") // what's typed
  const [search, setSearch] = useState("") // what's been sent to the API
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)

  const [detail, setDetail] = useState<Transaction | null>(null)
  const [refundTarget, setRefundTarget] = useState<Transaction | null>(null)
  const [refunding, setRefunding] = useState(false)

  const requestId = useRef(0)

  // Wait until typing pauses, then search from page 1 (one request, not one per keystroke)
  useEffect(() => {
    const next = query.trim()
    if (next === search) return
    const t = window.setTimeout(() => {
      setSearch(next)
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [query, search])

  const fetchTransactions = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const response = await apiClient.getTransactions({ search, status: statusFilter, page, limit: PAGE_SIZE })
      if (id !== requestId.current) return // a newer request has started; ignore this answer
      if (!response.success || !response.data) throw new Error(response.error || MESSAGES.ERRORS.FETCH_TRANSACTIONS)

      const data = response.data
      setTransactions(data.transactions)
      setTotalPages(Math.max(1, data.totalPages || 1))
      // Shown as "21–40 of 134" when the API returns a total; otherwise "Page 2 of 7"
      const maybeTotal = (data as { total?: unknown }).total
      setTotal(typeof maybeTotal === "number" ? maybeTotal : null)
      setError(null)
      setLoaded(true)
    } catch (err: unknown) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : MESSAGES.ERRORS.UNKNOWN_ERROR)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [search, statusFilter, page])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions, refreshKey])

  // If the list shrank (e.g. after a refund), don't leave the admin on an empty page
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const clearSearch = () => {
    setQuery("")
    setSearch("")
    setPage(1)
  }
  const clearFilters = () => {
    clearSearch()
    setStatusFilter("all")
  }

  const confirmRefund = async () => {
    if (!refundTarget || refunding) return
    const target = refundTarget
    setRefunding(true)
    try {
      const response = await apiClient.refundTransaction(target.id, "Admin initiated refund")
      if (!response.success) throw new Error(response.error || MESSAGES.ERRORS.REFUND_FAILED)
      toast.success(MESSAGES.SUCCESS.REFUND_PROCESSED, {
        description: `${formatKsh(target.amount)} refunded to ${formatPhone(target.phone)}`,
      })
      setRefundTarget(null)
      setDetail(null)
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      toast.error(MESSAGES.ERRORS.REFUND_FAILED, {
        description: err instanceof Error ? err.message : MESSAGES.ERRORS.UNKNOWN_ERROR,
      })
    } finally {
      setRefunding(false)
    }
  }

  const filtered = search !== "" || statusFilter !== "all"
  const filterLabel = FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Every M-Pesa payment, newest first."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              toast.info("Preparing your CSV…", { duration: 2000 })
              apiClient.exportTransactionsCSV()
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Panel aria-label="Payments">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") clearSearch() }}
              placeholder="Phone, M-Pesa receipt or transaction ID"
              aria-label="Search payments"
              className="h-10 rounded-[10px] pl-9 pr-9 text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <FilterChips
              label="Filter by status"
              options={FILTERS}
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            />
            {loading && loaded && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Updating" />}
          </div>
        </div>

        {/* Body */}
        {error ? (
          <ErrorState title="Couldn't load payments." message={error} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : !loaded ? (
          <ListSkeleton rows={8} columns={6} />
        ) : transactions.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No payments match"
              action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
            >
              {search ? `Nothing matches “${search}”${statusFilter !== "all" ? ` in ${filterLabel} payments` : ""}.` : `There are no ${filterLabel} payments.`}
            </EmptyState>
          ) : (
            <EmptyState icon={CreditCard} title="No payments yet">
              Payments appear here as soon as a customer pays with M-Pesa.
            </EmptyState>
          )
        ) : (
          <div aria-busy={loading} className={cn("transition-opacity duration-150", loading && "opacity-60")}>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className={cn(HEAD, "w-[150px] pl-5")}>Time</TableHead>
                    <TableHead className={HEAD}>Customer</TableHead>
                    <TableHead className={HEAD}>Plan</TableHead>
                    <TableHead className={cn(HEAD, "text-right")}>Amount</TableHead>
                    <TableHead className={HEAD}>Status</TableHead>
                    <TableHead className={HEAD}>M-Pesa receipt</TableHead>
                    <TableHead className="w-12 pr-3"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const when = formatWhen(t.timestamp)
                    return (
                      <TableRow
                        key={t.id}
                        onClick={() => setDetail(t)}
                        className="h-[52px] cursor-pointer border-border text-[13.5px] hover:bg-muted/40"
                      >
                        <TableCell className="py-0 pl-5 font-mono text-[12.5px] tabular-nums text-muted-foreground" title={when.full}>
                          {when.short}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-0 font-medium tabular-nums text-foreground">{formatPhone(t.phone)}</TableCell>
                        <TableCell className="py-0 text-muted-foreground">{t.package}</TableCell>
                        <TableCell className="whitespace-nowrap py-0 text-right font-semibold tabular-nums text-foreground">{formatKsh(t.amount)}</TableCell>
                        <TableCell className="py-0"><PaymentStatus status={t.status} /></TableCell>
                        <TableCell className="py-0 font-mono text-[12.5px] tracking-wide text-muted-foreground">{t.mpesaRef || "–"}</TableCell>
                        {/* Clicks inside the menu must not open the details panel */}
                        <TableCell className="w-12 py-0 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu
                            transaction={t}
                            onView={() => setDetail(t)}
                            onRefund={() => setRefundTarget(t)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-border md:hidden">
              {transactions.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setDetail(t)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <span className="truncate text-sm font-medium tabular-nums text-foreground">{formatPhone(t.phone)}</span>
                    <span className="text-right text-sm font-semibold tabular-nums text-foreground">{formatKsh(t.amount)}</span>
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      {t.package} · {formatWhen(t.timestamp).short}
                    </span>
                    <span className="justify-self-end"><PaymentStatus status={t.status} /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loaded && !error && transactions.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            noun={{ one: "payment", many: "payments" }}
            onPageChange={setPage}
            disabled={loading}
          />
        )}
      </Panel>

      {/* Details panel */}
      <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null) }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {detail && (
            <>
              <SheetHeader className="space-y-2 border-b border-border p-5 pr-12 text-left">
                <SheetTitle className="text-2xl font-semibold tabular-nums tracking-tight">{formatKsh(detail.amount)}</SheetTitle>
                <SheetDescription>
                  {detail.package} · {formatPhone(detail.phone)}
                </SheetDescription>
                <div><PaymentStatus status={detail.status} /></div>
              </SheetHeader>

              <dl className="flex-1 overflow-y-auto px-5">
                <DetailRow label="M-Pesa receipt" mono>
                  {detail.mpesaRef ? <CopyValue value={detail.mpesaRef} label="M-Pesa receipt" /> : "–"}
                </DetailRow>
                <DetailRow label="Phone">
                  {detail.phone ? <CopyValue value={formatPhone(detail.phone)} label="phone number" /> : "–"}
                </DetailRow>
                <DetailRow label="Plan">{detail.package}</DetailRow>
                <DetailRow label="Amount">{formatKsh(detail.amount)}</DetailRow>
                <DetailRow label="Time">{formatWhen(detail.timestamp).full || "–"}</DetailRow>
                <DetailRow label="Transaction ID" mono>
                  <CopyValue value={detail.id} label="transaction ID" />
                </DetailRow>
              </dl>

              {detail.status === "completed" && (
                <div className="grid gap-2.5 border-t border-border p-5">
                  <Button variant="outline" className="gap-2" onClick={() => apiClient.downloadReceipt(detail.id)}>
                    <Download className="h-4 w-4" aria-hidden />
                    Download receipt
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-[hsl(var(--danger)/0.35)] text-[hsl(var(--danger))] hover:bg-[var(--danger-soft)] hover:text-[hsl(var(--danger))]"
                    onClick={() => setRefundTarget(detail)}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    Refund payment
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Refund confirmation: stays open until the refund finishes, so it can't be sent twice */}
      <AlertDialog
        open={refundTarget !== null}
        onOpenChange={(open) => { if (!open && !refunding) setRefundTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund {refundTarget ? formatKsh(refundTarget.amount) : "this payment"}?</AlertDialogTitle>
            <AlertDialogDescription>{MESSAGES.CONFIRMATIONS.REFUND_TRANSACTION}</AlertDialogDescription>
          </AlertDialogHeader>

          {refundTarget && (
            <dl className="rounded-xl border border-border px-4 text-sm">
              <SummaryRow label="To">{formatPhone(refundTarget.phone)}</SummaryRow>
              <SummaryRow label="Plan">{refundTarget.package}</SummaryRow>
              <SummaryRow label="M-Pesa receipt" mono>{refundTarget.mpesaRef || "–"}</SummaryRow>
            </dl>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={refunding}>Keep payment</AlertDialogCancel>
            <AlertDialogAction
              disabled={refunding}
              onClick={(e) => {
                e.preventDefault()
                void confirmRefund()
              }}
              className="gap-2 bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:bg-[hsl(var(--danger)/0.9)]"
            >
              {refunding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Refunding
                </>
              ) : (
                `Refund ${refundTarget ? formatKsh(refundTarget.amount) : ""}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function RowMenu({ transaction, onView, onRefund }: { transaction: Transaction; onView: () => void; onRefund: () => void }) {
  const paid = transaction.status === "completed"
  return (
    // modal={false} stops the page locking up when the refund dialog opens from the menu
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for payment ${transaction.mpesaRef || transaction.id}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onView}>
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          View details
        </DropdownMenuItem>
        {paid && (
          <>
            <DropdownMenuItem onSelect={() => apiClient.downloadReceipt(transaction.id)}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              Download receipt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onRefund} className="text-[hsl(var(--danger))] focus:bg-[var(--danger-soft)] focus:text-[hsl(var(--danger))]">
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
              Refund payment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DetailRow({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3 border-b border-border py-3 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-foreground", mono ? "font-mono text-[13px] tracking-wide" : "font-medium")}>{children}</dd>
    </div>
  )
}

function SummaryRow({ label, mono, children }: { label: string; mono?: boolean; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right font-medium tabular-nums text-foreground", mono && "font-mono tracking-wide")}>{children}</dd>
    </div>
  )
}

export default PaymentManagement
