"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCount,
  formatKSh,
  formatNairobiHHMM,
  mapResultCodeToStatus,
  type LivePaymentsData,
  type PaymentFilter,
  type SectionResult,
  type StatusTone,
} from "@/lib/overview"

interface LivePaymentsPanelProps {
  section?: SectionResult<LivePaymentsData>
  isLoading: boolean
  nowMs: number
  newRowIds: Set<string>
  onViewAllPayments: () => void
  onRetry: () => void
}

const FILTER_CHIPS: Array<{ key: PaymentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
]

function pillClasses(tone: StatusTone): string {
  switch (tone) {
    case "success":
      return "bg-success-soft text-success"
    case "warning":
      return "bg-warning-soft text-warning"
    case "danger":
      return "bg-danger-soft text-danger"
    case "neutral":
    default:
      return "bg-surface-2 text-muted-foreground"
  }
}

export function LivePaymentsPanel({
  section,
  isLoading,
  nowMs,
  newRowIds,
  onViewAllPayments,
  onRetry,
}: LivePaymentsPanelProps) {
  const [filter, setFilter] = useState<PaymentFilter>("all")

  if (isLoading && !section) {
    return (
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3.5">
          <div>
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="mt-2 h-3.5 w-60 rounded" />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[30px] w-16 rounded-full" />
            ))}
          </div>
        </div>
        <div className="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5 divide-y divide-hairline">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 sm:px-5">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!section || !section.ok || !section.data) {
    return (
      <section className="flex min-w-0 flex-col justify-between rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <div>
          <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
            Live payments
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {section?.error || "Couldn't load payments."}
          </p>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onRetry}
            className="h-8 rounded-lg border border-border-strong bg-surface px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Retry
          </button>
        </div>
      </section>
    )
  }

  const data = section.data

  // Re-evaluate status against current client clock so >120s pending turns into Timed out smoothly
  const evaluatedRows = data.rows.map((row) => ({
    row,
    status: mapResultCodeToStatus(row.resultCode, row.requestedAt, nowMs),
  }))

  const counts = { all: evaluatedRows.length, paid: 0, pending: 0, failed: 0 }
  for (const item of evaluatedRows) {
    counts[item.status.category]++
  }

  const visibleRows = evaluatedRows
    .filter((item) => filter === "all" || item.status.category === filter)
    .slice(0, 8)

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
            Live payments
          </h2>
          <p className="mt-[3px] text-[12.5px] text-muted-foreground">
            New M-Pesa prompts appear here as customers pay.
          </p>
        </div>

        {!data.isEmpty && (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter payments">
            {FILTER_CHIPS.map((chip) => {
              const pressed = filter === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setFilter(chip.key)}
                  className={cn(
                    "inline-flex h-[30px] items-center gap-1.5 rounded-full border px-[11px] text-[12.5px] font-medium motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
                    pressed
                      ? "border-foreground bg-foreground text-background"
                      : "border-border-strong bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{chip.label}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      pressed ? "text-background opacity-60" : "text-faint"
                    )}
                  >
                    {formatCount(counts[chip.key])}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="-mx-4 -mb-4 sm:-mx-5 sm:-mb-5">
        {data.isEmpty ? (
          <div className="border-t border-hairline px-5 pb-11 pt-10 text-center text-[13.5px] text-muted-foreground">
            <strong className="mb-1 block text-[14.5px] font-semibold text-foreground">
              No payments yet today
            </strong>
            When a customer taps Pay, their M-Pesa prompt shows up here within a second.
          </div>
        ) : (
          <>
            {/* Desktop table header */}
            <div
              aria-hidden="true"
              className="hidden h-[38px] grid-cols-[70px_minmax(0,1.2fr)_minmax(0,0.9fr)_78px_138px_minmax(0,1fr)] items-center gap-3 px-5 text-[12px] font-medium text-faint sm:grid"
            >
              <span>Time</span>
              <span>Customer</span>
              <span>Plan</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
              <span>M-Pesa receipt</span>
            </div>

            {visibleRows.length === 0 ? (
              <div className="border-t border-hairline px-5 pb-11 pt-10 text-center text-[13.5px] text-muted-foreground">
                No payments match this filter.
              </div>
            ) : (
              <div>
                {visibleRows.map(({ row, status }) => {
                  const isNew = newRowIds.has(row.id)
                  const timeStr = formatNairobiHHMM(row.requestedAt)
                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-hairline px-4 py-[11px] text-[13.5px] sm:h-[50px] sm:grid-cols-[70px_minmax(0,1.2fr)_minmax(0,0.9fr)_78px_138px_minmax(0,1fr)] sm:gap-3 sm:px-5 sm:py-0 motion-safe:transition-colors motion-reduce:transition-none",
                        isNew ? "bg-accent-soft" : "bg-transparent"
                      )}
                      style={{
                        transitionDuration: isNew ? "0ms" : "1200ms",
                      }}
                    >
                      {/* Desktop Time */}
                      <span className="hidden font-mono text-[12.5px] text-muted-foreground tabular-nums sm:inline">
                        {timeStr}
                      </span>

                      {/* Customer */}
                      <span className="col-start-1 row-start-1 truncate font-medium text-foreground tabular-nums sm:col-auto sm:row-auto">
                        {row.maskedPhone}
                      </span>

                      {/* Plan (+ mobile time) */}
                      <span className="col-start-1 row-start-2 truncate text-[12.5px] text-muted-foreground sm:col-auto sm:row-auto sm:text-[13.5px]">
                        {row.planName}
                        <span className="sm:hidden"> · {timeStr}</span>
                      </span>

                      {/* Amount */}
                      <span className="col-start-2 row-start-1 text-right font-semibold text-foreground tabular-nums whitespace-nowrap sm:col-auto sm:row-auto">
                        {formatKSh(row.amount)}
                      </span>

                      {/* Status */}
                      <span className="col-start-2 row-start-2 justify-self-end sm:col-auto sm:row-auto sm:justify-self-start">
                        <span
                          className={cn(
                            "inline-flex h-6 items-center gap-1.5 rounded-full px-[9px] text-[12px] font-medium whitespace-nowrap",
                            pillClasses(status.tone)
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "h-1.5 w-1.5 rounded-full bg-current",
                              status.pulsing && "animate-dot-pulse"
                            )}
                          />
                          <span>{status.label}</span>
                        </span>
                      </span>

                      {/* Receipt */}
                      <span className="hidden truncate font-mono text-[12.5px] tracking-[0.03em] text-muted-foreground sm:inline">
                        {row.receipt || "–"}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t border-hairline px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={onViewAllPayments}
                className="text-[13px] font-medium text-primary hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                View all payments
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
