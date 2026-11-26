"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, Plus, RefreshCw, Ticket } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiClient, type Voucher } from "@/lib/api"
import { MESSAGES } from "@/lib/constants/messages"
import { cn } from "@/lib/utils"
import { GenerateDialog } from "./vouchers/GenerateDialog"
import { VoucherRow } from "./vouchers/VoucherRow"
import { EmptyState, ErrorState, FAINT, FilterChips, ListSkeleton, PageHeader, Pagination, Panel } from "./admin-ui"

/* ------------------------------------------------------------------ */
/* Config                                                               */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 50

type VoucherStatus = "all" | "unused" | "active" | "fully_used" | "expired"
type Counts = Partial<Record<VoucherStatus, number>>
const STATUSES = ["unused", "active", "fully_used", "expired"] as const

const FILTERS: Array<{ value: VoucherStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "unused", label: "Unused" },
  { value: "active", label: "Active" },
  { value: "fully_used", label: "Used" },
  { value: "expired", label: "Expired" },
]

const COLUMNS = ["Code", "Plan", "Uses", "Status", "Expires", "Created"]

const EMPTY_FILTER_TEXT: Record<Exclude<VoucherStatus, "all">, string> = {
  unused: "Every voucher has been used or has expired. Generate a new batch to hand out.",
  active: "No vouchers are in use right now.",
  fully_used: "No vouchers have been used up yet.",
  expired: "No vouchers have expired.",
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<VoucherStatus>("all")
  const [counts, setCounts] = useState<Counts>({})
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showGenerate, setShowGenerate] = useState(false)

  const requestId = useRef(0)

  const fetchVouchers = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const res = await apiClient.getVouchers({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      })
      if (id !== requestId.current) return // a newer request has started; ignore this answer
      if (!res.success || !res.data) throw new Error(res.error || MESSAGES.ERRORS.FETCH_VOUCHERS)

      const data = res.data
      setVouchers(data.vouchers)
      setTotal(data.total)
      setTotalPages(Math.max(1, data.totalPages || 1))
      setError(null)
      setLoaded(true)

      /*
       * Chip counts are shown only when they're accurate:
       * 1. The API returns `counts` for every status (best; see the note to the backend).
       * 2. Otherwise, on "All" with a single page, count the rows we have.
       * 3. Otherwise, the filtered total is the exact count for that one status.
       */
      const fromApi = (data as { counts?: Counts }).counts
      if (fromApi) {
        setCounts({ ...fromApi, all: fromApi.all ?? STATUSES.reduce((sum, s) => sum + (fromApi[s] ?? 0), 0) })
      } else if (statusFilter === "all" && data.totalPages <= 1) {
        const by = (s: (typeof STATUSES)[number]) => data.vouchers.filter((v) => v.status === s).length
        setCounts({ all: data.total, unused: by("unused"), active: by("active"), fully_used: by("fully_used"), expired: by("expired") })
      } else {
        setCounts((c) => ({ ...c, [statusFilter]: data.total }))
      }
    } catch (err: unknown) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : MESSAGES.ERRORS.FETCH_VOUCHERS)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => {
    fetchVouchers()
  }, [fetchVouchers, refreshKey])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const refresh = () => setRefreshKey((k) => k + 1)

  const changeFilter = (value: VoucherStatus) => {
    setStatusFilter(value)
    setPage(1)
  }

  // New vouchers are unused: show them on page 1, and recount from fresh data
  const handleGenerated = (created: Voucher[]) => {
    setCounts({})
    setPage(1)
    setStatusFilter((f) => (f === "all" ? f : "unused"))
    refresh()
    if (created.length) toast.success(`${created.length} voucher${created.length === 1 ? "" : "s"} generated`)
  }

  const allCount = counts.all ?? (statusFilter === "all" && loaded ? total : undefined)
  const description =
    allCount === undefined
      ? "Prepaid codes customers can enter instead of paying."
      : `${allCount.toLocaleString("en-US")} voucher${allCount === 1 ? "" : "s"}${
          counts.unused !== undefined ? ` · ${counts.unused.toLocaleString("en-US")} unused` : ""
        }`

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vouchers"
        description={description}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={refresh} disabled={loading} aria-label="Refresh vouchers">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => apiClient.exportVouchersCSV()}>
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
            <Button className="gap-2" onClick={() => setShowGenerate(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Generate vouchers
            </Button>
          </>
        }
      />

      <Panel aria-label="Vouchers">
        <div className="border-b border-border p-4 sm:p-5">
          <FilterChips
            label="Filter by status"
            options={FILTERS.map((f) => ({ ...f, count: f.value === "all" ? allCount ?? null : counts[f.value] ?? null }))}
            value={statusFilter}
            onChange={changeFilter}
          />
        </div>

        {error ? (
          <ErrorState title="Couldn't load vouchers." message={error} onRetry={refresh} />
        ) : !loaded ? (
          <ListSkeleton rows={8} columns={6} />
        ) : vouchers.length === 0 ? (
          statusFilter === "all" ? (
            <EmptyState
              icon={Ticket}
              title="No vouchers yet"
              action={
                <Button className="gap-2" onClick={() => setShowGenerate(true)}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Generate vouchers
                </Button>
              }
            >
              Generate a batch to sell at the counter or give away. Customers enter the code on the portal to get online.
            </EmptyState>
          ) : (
            <EmptyState
              icon={Ticket}
              title={`No ${FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase()} vouchers`}
              action={<Button variant="outline" size="sm" onClick={() => changeFilter("all")}>Show all vouchers</Button>}
            >
              {EMPTY_FILTER_TEXT[statusFilter]}
            </EmptyState>
          )
        ) : (
          <div aria-busy={loading} className={cn("overflow-x-auto transition-opacity duration-150", loading && "opacity-60")}>
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((h) => (
                    <th key={h} scope="col" className={cn("h-10 whitespace-nowrap px-4 text-left text-xs font-medium", FAINT)}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="[&>tr:last-child]:border-b-0 [&>tr]:border-b [&>tr]:border-border">
                {vouchers.map((v) => (
                  <VoucherRow key={v.id} v={v} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loaded && !error && vouchers.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            noun={{ one: "voucher", many: "vouchers" }}
            onPageChange={setPage}
            disabled={loading}
          />
        )}
      </Panel>

      {showGenerate && <GenerateDialog onClose={() => setShowGenerate(false)} onGenerated={handleGenerated} />}
    </div>
  )
}
