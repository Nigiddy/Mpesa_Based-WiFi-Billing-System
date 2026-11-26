"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { wsClient } from "@/lib/api"
import {
  getOverview,
  mapResultCodeToStatus,
  maskPhoneClient,
  OVERVIEW_THRESHOLDS,
  type OverviewPayload,
  type OverviewRange,
  type LivePaymentRow,
} from "@/lib/overview"

const FALLBACK_POLL_MS = 5000
const HIGHLIGHT_DURATION_MS = 1200

export type LiveConnectionState = "live" | "paused" | "waiting"

export interface UseOverviewResult {
  data: OverviewPayload | null
  isLoading: boolean
  error: string | null
  nowMs: number
  liveState: LiveConnectionState
  newRowIds: Set<string>
  refresh: () => Promise<void>
}

export function useOverview(
  range: OverviewRange,
  enabled: boolean,
  isActiveTab: boolean = true
): UseOverviewResult {
  const [data, setData] = useState<OverviewPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [wsOpen, setWsOpen] = useState(() =>
    typeof window !== "undefined" ? wsClient.isOpen() : false
  )
  const [isTabHidden, setIsTabHidden] = useState(() =>
    typeof document !== "undefined" ? document.hidden : false
  )
  const [newRowIds, setNewRowIds] = useState<Set<string>>(() => new Set())

  const seenIdsRef = useRef<Set<string> | null>(null)
  const inFlightRef = useRef(false)
  const highlightTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const hasDataRef = useRef(false)

  const markRowsAsNew = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setNewRowIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
    for (const id of ids) {
      const existing = highlightTimersRef.current.get(id)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        highlightTimersRef.current.delete(id)
        setNewRowIds((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, HIGHLIGHT_DURATION_MS)
      highlightTimersRef.current.set(id, timer)
    }
  }, [])

  const fetchOverview = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled || inFlightRef.current) return
      inFlightRef.current = true
      if (!opts?.silent && !hasDataRef.current) {
        setIsLoading(true)
      }
      try {
        const next = await getOverview(range)

        if (next.payments.ok && next.payments.data) {
          const incomingIds = next.payments.data.rows.map((r) => r.id)
          if (seenIdsRef.current === null) {
            seenIdsRef.current = new Set(incomingIds)
          } else {
            const added: string[] = []
            for (const id of incomingIds) {
              if (!seenIdsRef.current.has(id)) {
                seenIdsRef.current.add(id)
                added.push(id)
              }
            }
            if (added.length > 0) {
              markRowsAsNew(added)
            }
          }
        }

        hasDataRef.current = true
        setData(next)
        setError(null)
        setNowMs(Date.now())
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load overview.")
      } finally {
        inFlightRef.current = false
        setIsLoading(false)
      }
    },
    [enabled, range, markRowsAsNew]
  )

  // Initial load & reload on range change or returning to Overview tab
  useEffect(() => {
    if (!enabled || !isActiveTab) return
    fetchOverview({ silent: hasDataRef.current })
  }, [enabled, isActiveTab, range, fetchOverview])

  // WebSocket connection + event listeners
  useEffect(() => {
    if (!enabled) return

    if (!wsClient.isConnected()) {
      wsClient.connect()
    }
    setWsOpen(wsClient.isOpen())

    const handleWsConnection = (e: Event) => {
      const detail = (e as CustomEvent<{ connected: boolean }>).detail
      setWsOpen(Boolean(detail?.connected))
    }

    const handlePaymentStatus = (e: Event) => {
      const payload = (e as CustomEvent<Record<string, unknown>>).detail || {}
      const txId = typeof payload.transactionId === "string" ? payload.transactionId : null
      const status = typeof payload.status === "string" ? payload.status : null
      const rawCode = payload.resultCode
      const resultCode =
        status === "completed"
          ? 0
          : typeof rawCode === "number"
            ? rawCode
            : typeof rawCode === "string" && rawCode !== ""
              ? Number(rawCode)
              : -1

      if (txId) {
        setData((prev) => {
          if (!prev || !prev.payments.ok || !prev.payments.data) return prev
          const rows = prev.payments.data.rows
          const idx = rows.findIndex((r) => r.id === txId)
          if (idx === -1) return prev

          const mapped = mapResultCodeToStatus(resultCode, rows[idx].requestedAt)
          const updatedRow: LivePaymentRow = {
            ...rows[idx],
            resultCode,
            category: mapped.category,
            receipt:
              typeof payload.mpesaReceiptNumber === "string"
                ? payload.mpesaReceiptNumber
                : rows[idx].receipt,
            maskedPhone:
              typeof payload.phone === "string"
                ? maskPhoneClient(payload.phone)
                : rows[idx].maskedPhone,
          }

          const nextRows = [...rows]
          nextRows[idx] = updatedRow

          const counts = { all: nextRows.length, paid: 0, pending: 0, failed: 0 }
          for (const r of nextRows) counts[r.category]++

          return {
            ...prev,
            payments: {
              ...prev.payments,
              data: {
                ...prev.payments.data,
                counts,
                rows: nextRows,
              },
            },
          }
        })
      }

      if (!document.hidden && isActiveTab) {
        fetchOverview({ silent: true })
      }
    }

    const handleSessionChange = () => {
      if (!document.hidden && isActiveTab) {
        fetchOverview({ silent: true })
      }
    }

    window.addEventListener("ws_connection_change", handleWsConnection)
    window.addEventListener("payment_status_update", handlePaymentStatus)
    window.addEventListener("user_connected", handleSessionChange)
    window.addEventListener("user_disconnected", handleSessionChange)

    return () => {
      window.removeEventListener("ws_connection_change", handleWsConnection)
      window.removeEventListener("payment_status_update", handlePaymentStatus)
      window.removeEventListener("user_connected", handleSessionChange)
      window.removeEventListener("user_disconnected", handleSessionChange)
    }
  }, [enabled, isActiveTab, fetchOverview])

  // Pause while document.hidden, refetch immediately when tab becomes visible
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      const hidden = document.hidden
      setIsTabHidden(hidden)
      if (!hidden && isActiveTab) {
        fetchOverview({ silent: true })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enabled, isActiveTab, fetchOverview])

  // Poll every 5s while visible & on Overview tab
  useEffect(() => {
    if (!enabled || !isActiveTab || isTabHidden) return
    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchOverview({ silent: true })
      }
    }, FALLBACK_POLL_MS)
    return () => clearInterval(timer)
  }, [enabled, isActiveTab, isTabHidden, fetchOverview])

  // 1-second clock tick for pending countdown & callback relative age
  useEffect(() => {
    if (!enabled || !isActiveTab || isTabHidden) return
    const timer = setInterval(() => {
      const now = Date.now()
      setNowMs(now)

      // If any pending row just crossed the 120s timeout, trigger a silent refresh so KPIs stay synced
      if (data?.kpis.ok && data.kpis.data && data.kpis.data.pendingCount > 0 && data.kpis.data.oldestPendingAt) {
        const oldestSec = (now - new Date(data.kpis.data.oldestPendingAt).getTime()) / 1000
        if (oldestSec > OVERVIEW_THRESHOLDS.PENDING_TIMEOUT_SECONDS) {
          fetchOverview({ silent: true })
        }
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [enabled, isActiveTab, isTabHidden, data, fetchOverview])

  useEffect(() => {
    const timers = highlightTimersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  let liveState: LiveConnectionState = "live"
  if (data && data.hasTodayPrompts === false) {
    liveState = "waiting"
  } else if (isTabHidden || !wsOpen) {
    liveState = "paused"
  }

  return {
    data,
    isLoading,
    error,
    nowMs,
    liveState,
    newRowIds,
    refresh: () => fetchOverview({ silent: false }),
  }
}
