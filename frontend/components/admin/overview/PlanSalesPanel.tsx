"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCount,
  formatKSh,
  type PlanMixData,
  type SectionResult,
} from "@/lib/overview"

interface PlanSalesPanelProps {
  section?: SectionResult<PlanMixData>
  isLoading: boolean
  onRetry: () => void
}

export function PlanSalesPanel({
  section,
  isLoading,
  onRetry,
}: PlanSalesPanelProps) {
  if (isLoading && !section) {
    return (
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <Skeleton className="h-5 w-4/5 rounded" />
        <Skeleton className="mt-2 h-3.5 w-28 rounded" />
        <div className="mt-4 space-y-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded" />
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
            Plan sales
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {section?.error || "Couldn't load plan sales."}
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

  if (data.isEmpty) {
    return (
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <div className="mb-3.5">
          <h2 className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
            Plan sales
          </h2>
          <p className="mt-[3px] text-[12.5px] text-muted-foreground">
            Shows which plans earn the most once payments come in.
          </p>
        </div>
        <div className="py-5 text-[13.5px] text-muted-foreground">
          Nothing sold yet today.
        </div>
      </section>
    )
  }

  const top = data.plans[0]
  const totalRevenue = data.totalRevenue || 1
  const sharePct = Math.round((top.revenue / totalRevenue) * 100)
  const sharePhrase =
    sharePct >= 45 && sharePct <= 55 ? "about half" : `${sharePct}%`

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="mb-3.5">
        <h2 className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
          {top.name} plans bring in {sharePhrase} of today&apos;s revenue
        </h2>
        <p className="mt-[3px] text-[12.5px] text-muted-foreground">
          {formatCount(data.totalSold)}{" "}
          {data.totalSold === 1 ? "plan" : "plans"} sold today
        </p>
      </div>

      <div className="mt-1 grid gap-3.5">
        {data.plans.map((plan, idx) => {
          const widthPct =
            top.revenue > 0 ? ((plan.revenue / top.revenue) * 100).toFixed(1) : "0"
          return (
            <div key={plan.key}>
              <div className="mb-1.5 flex justify-between gap-2.5 text-[13.5px]">
                <span className="font-medium text-foreground">{plan.name}</span>
                <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                  {formatCount(plan.soldCount)} sold · {formatKSh(plan.revenue)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-[4px] bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-[4px] motion-safe:transition-[width] motion-safe:duration-300",
                    idx === 0 ? "bg-primary" : "bg-faint"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
