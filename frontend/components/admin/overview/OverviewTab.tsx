"use client"

import { formatNairobiDate, type OverviewRange } from "@/lib/overview"
import type { UseOverviewResult } from "@/hooks/use-overview"
import { OverviewHeader } from "./OverviewHeader"
import { KpiStrip } from "./KpiStrip"
import { RevenueChart } from "./RevenueChart"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { LivePaymentsPanel } from "./LivePaymentsPanel"
import { PlanSalesPanel } from "./PlanSalesPanel"

interface OverviewTabProps {
  range: OverviewRange
  onRangeChange: (range: OverviewRange) => void
  overview: UseOverviewResult
  onViewAllPayments: () => void
}

export function OverviewTab({
  range,
  onRangeChange,
  overview,
  onViewAllPayments,
}: OverviewTabProps) {
  const { data, isLoading, error, nowMs, liveState, newRowIds, refresh } = overview
  const businessDate = data?.businessDate || formatNairobiDate()

  // If the entire overview endpoint failed before any data loaded, each panel receives an error state
  // with its own Retry button so one failing query never blanks the page.
  const kpiSection =
    data?.kpis ?? (error ? { ok: false, error: "Couldn't load summary metrics." } : undefined)
  const chartSection =
    data?.chart ?? (error ? { ok: false, error: "Couldn't load revenue chart." } : undefined)
  const healthSection =
    data?.health ?? (error ? { ok: false, error: "Couldn't load system health." } : undefined)
  const paymentsSection =
    data?.payments ?? (error ? { ok: false, error: "Couldn't load payments." } : undefined)
  const planMixSection =
    data?.planMix ?? (error ? { ok: false, error: "Couldn't load plan sales." } : undefined)

  return (
    <div>
      <OverviewHeader
        businessDate={businessDate}
        liveState={liveState}
        range={range}
        onRangeChange={onRangeChange}
      />

      <KpiStrip
        range={range}
        section={kpiSection}
        isLoading={isLoading}
        nowMs={nowMs}
        onRetry={refresh}
      />

      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:mb-5 sm:gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <RevenueChart
          range={range}
          section={chartSection}
          isLoading={isLoading}
          onRetry={refresh}
        />
        <SystemHealthPanel
          section={healthSection}
          isLoading={isLoading}
          nowMs={nowMs}
          onRetry={refresh}
        />
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <LivePaymentsPanel
          section={paymentsSection}
          isLoading={isLoading}
          nowMs={nowMs}
          newRowIds={newRowIds}
          onViewAllPayments={onViewAllPayments}
          onRetry={refresh}
        />
        <PlanSalesPanel
          section={planMixSection}
          isLoading={isLoading}
          onRetry={refresh}
        />
      </div>
    </div>
  )
}
