"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  CheckCircle, Download, Eye, Loader2, MoreHorizontal, Search, SearchX, Trash2, UserX, Users, WifiOff, X,
  type LucideIcon,
} from "lucide-react"
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
import { apiClient, type User } from "@/lib/api"
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

type StatusFilter = "all" | "active" | "expired" | "blocked"
type Action = "disconnect" | "block" | "unblock" | "delete"

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "blocked", label: "Blocked" },
]

const STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  expired: { label: "Expired", tone: "neutral" },
  blocked: { label: "Blocked", tone: "danger" },
}

const statusOf = (status: string) =>
  STATUS[status] ?? {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : "Unknown",
    tone: "neutral" as Tone,
  }

const UserStatus = ({ status }: { status: string }) => {
  const s = statusOf(status)
  return <StatusPill tone={s.tone}>{s.label}</StatusPill>
}

const formatMac = (mac?: string | null) => (mac ? mac.toUpperCase() : "–")

/** What each action asks before running. Unblock is harmless, so it runs straight away. */
const CONFIRM: Record<Exclude<Action, "unblock">, (u: User) => { title: string; text: string; cta: string; danger: boolean }> = {
  disconnect: (u) => ({
    title: `Disconnect ${formatPhone(u.phone)}?`,
    text: `This ends the current connection for ${formatMac(u.macAddress)}. Their account and plan aren't changed.`,
    cta: "Disconnect",
    danger: false,
  }),
  block: (u) => ({
    title: `Block ${formatPhone(u.phone)}?`,
    text: "They'll be disconnected now and won't be able to get online, even with a paid plan, until you unblock them.",
    cta: "Block user",
    danger: true,
  }),
  delete: (u) => ({
    title: `Delete ${formatPhone(u.phone)}?`,
    text: `${MESSAGES.CONFIRMATIONS.DELETE_USER} This can't be undone.`,
    cta: "Delete user",
    danger: true,
  }),
}

const DONE: Record<Action, { title: string; text: (phone: string) => string }> = {
  disconnect: { title: MESSAGES.SUCCESS.USER_DISCONNECTED, text: (p) => `${p} has been disconnected.` },
  block: { title: MESSAGES.SUCCESS.USER_BLOCKED, text: (p) => `${p} can no longer get online.` },
  unblock: { title: MESSAGES.SUCCESS.USER_UNBLOCKED, text: (p) => `${p} can get online again.` },
  delete: { title: MESSAGES.SUCCESS.USER_DELETED, text: (p) => `${p} has been removed.` },
}

const runAction = (action: Action, id: number) => {
  switch (action) {
    case "disconnect": return apiClient.disconnectUser(id)
    case "block": return apiClient.blockUser(id)
    case "unblock": return apiClient.unblockUser(id)
    case "delete": return apiClient.deleteUser(id)
  }
}

/** Actions that make sense for this user's status */
const actionsFor = (u: User): Action[] => [
  ...(u.status === "active" ? (["disconnect"] as const) : []),
  u.status === "blocked" ? "unblock" : "block",
  "delete",
]

const ACTION_UI: Record<Action, { label: string; icon: LucideIcon; danger?: boolean }> = {
  disconnect: { label: "Disconnect", icon: WifiOff },
  block: { label: "Block user", icon: UserX, danger: true },
  unblock: { label: "Unblock user", icon: CheckCircle },
  delete: { label: "Delete user", icon: Trash2, danger: true },
}

const HEAD = cn("h-10 text-xs font-medium", FAINT)
const DANGER_ITEM = "text-[hsl(var(--danger))] focus:bg-[var(--danger-soft)] focus:text-[hsl(var(--danger))]"

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([])
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

  const [detailId, setDetailId] = useState<number | null>(null)
  const [pending, setPending] = useState<{ user: User; action: Exclude<Action, "unblock"> } | null>(null)
  const [busy, setBusy] = useState<{ id: number; action: Action } | null>(null)

  const requestId = useRef(0)
  // Keep the details panel in step with refreshed data
  const detail = detailId === null ? null : users.find((u) => u.id === detailId) ?? null

  // Wait until typing pauses, then search from page 1
  useEffect(() => {
    const next = query.trim()
    if (next === search) return
    const t = window.setTimeout(() => {
      setSearch(next)
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [query, search])

  const fetchUsers = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    try {
      const response = await apiClient.getUsers({ search, status: statusFilter, page, limit: PAGE_SIZE })
      if (id !== requestId.current) return // a newer request has started; ignore this answer
      if (!response.success || !response.data) throw new Error(response.error || MESSAGES.ERRORS.FETCH_USERS)

      const data = response.data
      setUsers(data.users)
      setTotalPages(Math.max(1, data.totalPages || 1))
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
    fetchUsers()
  }, [fetchUsers, refreshKey])

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

  /** Unblock runs immediately; everything else asks first */
  const requestAction = (user: User, action: Action) => {
    if (action === "unblock") void perform(user, action)
    else setPending({ user, action })
  }

  const perform = async (user: User, action: Action) => {
    if (busy) return
    setBusy({ id: user.id, action })
    try {
      const response = await runAction(action, user.id)
      if (!response?.success) throw new Error(response?.error || MESSAGES.ERRORS.ACTION_FAILED)
      toast.success(DONE[action].title, { description: DONE[action].text(formatPhone(user.phone)) })
      setPending(null)
      if (action === "delete") setDetailId(null)
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      toast.error(MESSAGES.ERRORS.ACTION_FAILED, {
        description: err instanceof Error ? err.message : MESSAGES.ERRORS.UNKNOWN_ERROR,
      })
    } finally {
      setBusy(null)
    }
  }

  const filtered = search !== "" || statusFilter !== "all"
  const filterLabel = FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase()
  const confirm = pending ? CONFIRM[pending.action](pending.user) : null
  const confirming = busy !== null && pending !== null && busy.id === pending.user.id

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Everyone who has bought WiFi, by phone number and device."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              toast.info("Preparing your CSV…", { duration: 2000 })
              apiClient.exportUsersCSV()
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        }
      />

      <Panel aria-label="Users">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") clearSearch() }}
              placeholder="Phone number or MAC address"
              aria-label="Search users"
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
          <ErrorState title="Couldn't load users." message={error} onRetry={() => setRefreshKey((k) => k + 1)} />
        ) : !loaded ? (
          <ListSkeleton rows={8} columns={6} />
        ) : users.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No users match"
              action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
            >
              {search ? `Nothing matches “${search}”${statusFilter !== "all" ? ` among ${filterLabel} users` : ""}.` : `There are no ${filterLabel} users.`}
            </EmptyState>
          ) : (
            <EmptyState icon={Users} title="No users yet">
              A user is added the first time someone buys a plan on the portal.
            </EmptyState>
          )
        ) : (
          <div aria-busy={loading} className={cn("transition-opacity duration-150", loading && "opacity-60")}>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className={cn(HEAD, "pl-5")}>Phone</TableHead>
                    <TableHead className={HEAD}>Device (MAC)</TableHead>
                    <TableHead className={HEAD}>Status</TableHead>
                    <TableHead className={HEAD}>Current plan</TableHead>
                    <TableHead className={cn(HEAD, "text-right")}>Total spent</TableHead>
                    <TableHead className={HEAD}>Last seen</TableHead>
                    <TableHead className="w-12 pr-3"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const seen = formatWhen(u.lastSeen)
                    const rowBusy = busy?.id === u.id
                    return (
                      <TableRow
                        key={u.id}
                        onClick={() => setDetailId(u.id)}
                        className="h-[52px] cursor-pointer border-border text-[13.5px] hover:bg-muted/40"
                      >
                        <TableCell className="whitespace-nowrap py-0 pl-5 font-medium tabular-nums text-foreground">{formatPhone(u.phone)}</TableCell>
                        <TableCell className="py-0 font-mono text-[12.5px] tracking-wide text-muted-foreground">{formatMac(u.macAddress)}</TableCell>
                        <TableCell className="py-0"><UserStatus status={u.status} /></TableCell>
                        <TableCell className={cn("py-0", u.currentPackage ? "text-muted-foreground" : FAINT)}>{u.currentPackage || "No plan"}</TableCell>
                        <TableCell className="whitespace-nowrap py-0 text-right font-semibold tabular-nums text-foreground">{formatKsh(u.totalSpent)}</TableCell>
                        <TableCell className="whitespace-nowrap py-0 text-muted-foreground" title={seen.full}>{seen.short}</TableCell>
                        <TableCell className="w-12 py-0 pr-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {rowBusy ? (
                            <span className="inline-grid h-8 w-8 place-items-center">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Working" />
                            </span>
                          ) : (
                            <RowMenu user={u} onView={() => setDetailId(u.id)} onAction={(a) => requestAction(u, a)} disabled={busy !== null} />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile list */}
            <ul className="divide-y divide-border md:hidden">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setDetailId(u.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <span className="truncate text-sm font-medium tabular-nums text-foreground">{formatPhone(u.phone)}</span>
                    <span className="justify-self-end"><UserStatus status={u.status} /></span>
                    <span className="truncate text-[12.5px] text-muted-foreground">
                      {u.currentPackage || "No plan"} · {formatWhen(u.lastSeen).short}
                    </span>
                    <span className="text-right text-[12.5px] font-medium tabular-nums text-muted-foreground">{formatKsh(u.totalSpent)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loaded && !error && users.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            noun={{ one: "user", many: "users" }}
            onPageChange={setPage}
            disabled={loading}
          />
        )}
      </Panel>

      {/* Details panel */}
      <Sheet open={detail !== null} onOpenChange={(open) => { if (!open) setDetailId(null) }}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {detail && (
            <>
              <SheetHeader className="space-y-2 border-b border-border p-5 pr-12 text-left">
                <SheetTitle className="text-2xl font-semibold tabular-nums tracking-tight">{formatPhone(detail.phone)}</SheetTitle>
                <SheetDescription>
                  {detail.currentPackage ? `On ${detail.currentPackage}` : "No current plan"} · {formatKsh(detail.totalSpent)} spent in total
                </SheetDescription>
                <div><UserStatus status={detail.status} /></div>
              </SheetHeader>

              <dl className="flex-1 overflow-y-auto px-5">
                <DetailRow label="Phone">
                  {detail.phone ? <CopyValue value={formatPhone(detail.phone)} label="phone number" /> : "–"}
                </DetailRow>
                <DetailRow label="Device (MAC)" mono>
                  {detail.macAddress ? <CopyValue value={formatMac(detail.macAddress)} label="MAC address" /> : "–"}
                </DetailRow>
                <DetailRow label="Current plan">{detail.currentPackage || "No plan"}</DetailRow>
                <DetailRow label="Total spent">{formatKsh(detail.totalSpent)}</DetailRow>
                <DetailRow label="Last seen">{formatWhen(detail.lastSeen).full || formatWhen(detail.lastSeen).short}</DetailRow>
                <DetailRow label="User ID" mono>{String(detail.id)}</DetailRow>
              </dl>

              <div className="grid gap-2.5 border-t border-border p-5">
                {actionsFor(detail).map((a) => {
                  const ui = ACTION_UI[a]
                  const Icon = ui.icon
                  const working = busy?.id === detail.id && busy.action === a
                  return (
                    <Button
                      key={a}
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => requestAction(detail, a)}
                      className={cn(
                        "gap-2",
                        ui.danger && "border-[hsl(var(--danger)/0.35)] text-[hsl(var(--danger))] hover:bg-[var(--danger-soft)] hover:text-[hsl(var(--danger))]"
                      )}
                    >
                      {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                      {ui.label}
                    </Button>
                  )
                })}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation: stays open until the action finishes, so it can't be sent twice */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => { if (!open && !confirming) setPending(null) }}>
        <AlertDialogContent>
          {pending && confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
                <AlertDialogDescription>{confirm.text}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={confirming}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirming}
                  onClick={(e) => {
                    e.preventDefault()
                    void perform(pending.user, pending.action)
                  }}
                  className={cn(
                    "gap-2",
                    confirm.danger && "bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))] hover:bg-[hsl(var(--danger)/0.9)]"
                  )}
                >
                  {confirming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {confirm.cta}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

function RowMenu({ user, onView, onAction, disabled }: { user: User; onView: () => void; onAction: (a: Action) => void; disabled: boolean }) {
  const actions = actionsFor(user)
  return (
    // modal={false} stops the page locking up when a dialog opens from the menu
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled} aria-label={`Actions for ${formatPhone(user.phone)}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onView}>
          <Eye className="mr-2 h-4 w-4" aria-hidden />
          View details
        </DropdownMenuItem>
        {actions.filter((a) => a !== "delete").map((a) => {
          const ui = ACTION_UI[a]
          const Icon = ui.icon
          return (
            <DropdownMenuItem key={a} onSelect={() => onAction(a)}>
              <Icon className="mr-2 h-4 w-4" aria-hidden />
              {ui.label}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onAction("delete")} className={DANGER_ITEM}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete user
        </DropdownMenuItem>
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

export default UserManagement
