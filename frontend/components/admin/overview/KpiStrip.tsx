"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCount,
  type KpiData,
  type OverviewRange,
  type SectionResult,
} from "@/lib/overview"

interface KpiStripProps {
  range: OverviewRange
  section?: SectionResult<KpiData>
  isLoading: boolean
  nowMs: number
  onRetry: () => void
}

function KShValue({ amount }: { amount: number }) {
  return (
    <>
      <span className="mr-1 text-[0.55em] font-medium tracking-normal text-muted-foreground">
        KSh
      </span>
      {formatCount(amount)}
    </>
  )
}

export function KpiStrip({
  range,
  section,
  isLoading,
  nowMs,
  onRetry,
}: KpiStripProps) {
  if (isLoading && !section) {
    return (
      <section
        aria-label="Key numbers"
        className="mb-3.5 grid grid-cols-2 rounded-2xl border border-hairline bg-surface sm:mb-5 lg:grid-cols-4"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "min-w-0 p-3.5 sm:px-5 sm:py-[18px]",
              i % 2 === 1 && "border-l border-hairline",
              i >= 2 && "border-t border-hairline lg:border-t-0",
              i >= 1 && "lg:border-l lg:border-hairline"
            )}
          >
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="mt-2.5 h-7 w-28 rounded sm:h-8" />
            <Skeleton className="mt-2.5 h-3.5 w-36 rounded" />
          </div>
        ))}
      </section>
    )
  }

  if (!section || !section.ok || !section.data) {
    return (
      <section
        aria-label="Key numbers"
        className="mb-3.5 flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-4 sm:mb-5 sm:px-5 sm:py-[18px]"
      >
        <p className="text-[13.5px] text-muted-foreground">
          {section?.error || "Couldn't load summary metrics."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-8 shrink-0 rounded-lg border border-border-strong bg-surface px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Retry
        </button>
      </section>
    )
  }

  const d = section.data
  const showEmptyDay = range === "today" && d.isEmptyDay

  const oldestSec = d.oldestPendingAt
    ? Math.max(0, Math.round((nowMs - new Date(d.oldestPendingAt).getTime()) / 1000))
    : 0

  const pendingContext =
    d.pendingCount > 0 && d.oldestPendingAt
      ? `Oldest has waited ${oldestSec}s`
      : "No one is waiting"

  const deltaNode = (() => {
    if (d.revenueDeltaPct === null) {
      return range === "today"
        ? "No payments yesterday by now"
        : "No payments in prior 7 days"
    }
    const rounded = Math.abs(d.revenueDeltaPct).toFixed(0)
    const positive = d.revenueDeltaPct >= 0
    return (
      <>
        <span
          className={cn(
            "font-semibold",
            positive ? "text-success" : "text-danger"
          )}
        >
          {positive ? "+" : "−"}
          {rounded}%
        </span>{" "}
        {range === "today" ? "vs yesterday by now" : "vs the 7 days before"}
      </>
    )
  })()

  const cells = showEmptyDay
    ? [
        {
          label: "Revenue today",
          value: <KShValue amount={0} />,
          context: "No payments yet today",
        },
        {
          label: "Active sessions",
          value: formatCount(d.activeSessions),
          context:
            d.activeSessions === 0
              ? "No devices connected"
              : "No plans sold yet today",
        },
        {
          label: "Payment success",
          value: <span className="text-faint">–</span>,
          context: "No prompts sent yet",
        },
        {
          label: "Pending now",
          value: "0",
          context: "No one is waiting",
        },
      ]
    : [
        {
          label: range === "today" ? "Revenue today" : "Revenue, 7 days",
          value: <KShValue amount={d.revenue} />,
          context: deltaNode,
        },
        {
          label: "Active sessions",
          value: formatCount(d.activeSessions),
          context:
            range === "today"
              ? `${formatCount(d.todayPlansSold)} ${d.todayPlansSold === 1 ? "plan" : "plans"} sold today`
              : d.activeSessions === 0
                ? "No devices connected"
                : "Right now",
        },
        {
          label: "Payment success",
          value:
            d.successRate === null ? (
              <span className="text-faint">–</span>
            ) : (
              `${d.successRate.toFixed(1)}%`
            ),
          context:
            d.finishedCount === 0
              ? d.pendingCount > 0
                ? "Waiting for first result"
                : "No prompts sent yet"
              : `${formatCount(d.paidCount)} of ${formatCount(d.finishedCount)} prompts paid`,
        },
        {
          label: "Pending now",
          value: formatCount(d.pendingCount),
          context: pendingContext,
        },
      ]

  return (
    <section
      aria-label="Key numbers"
      className="mb-3.5 grid grid-cols-2 rounded-2xl border border-hairline bg-surface sm:mb-5 lg:grid-cols-4"
    >
      {cells.map((cell, idx) => (
        <div
          key={cell.label}
          className={cn(
            "min-w-0 p-3.5 sm:px-5 sm:py-[18px]",
            idx % 2 === 1 && "border-l border-hairline",
            idx >= 2 && "border-t border-hairline lg:border-t-0",
            idx >= 1 && "lg:border-l lg:border-hairline"
          )}
        >
          <div className="text-[13px] text-muted-foreground">{cell.label}</div>
          <div className="mt-1.5 text-[22px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground tabular-nums whitespace-nowrap sm:text-[28px]">
            {cell.value}
          </div>
          <div className="mt-1.5 text-[12px] text-muted-foreground sm:truncate sm:text-[12.5px]">
            {cell.context}
          </div>
        </div>
      ))}
    </section>
  )
}
