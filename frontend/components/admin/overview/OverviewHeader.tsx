"use client"

import { cn } from "@/lib/utils"
import type { OverviewRange } from "@/lib/overview"
import type { LiveConnectionState } from "@/hooks/use-overview"

interface OverviewHeaderProps {
  businessDate: string
  liveState: LiveConnectionState
  range: OverviewRange
  onRangeChange: (range: OverviewRange) => void
}

export function OverviewHeader({
  businessDate,
  liveState,
  range,
  onRangeChange,
}: OverviewHeaderProps) {
  const isLive = liveState === "live"
  const liveLabel =
    liveState === "waiting"
      ? "Waiting for the first payment"
      : liveState === "paused"
        ? "Paused"
        : "Live"

  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4 sm:mb-5">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.025em] text-foreground sm:text-[26px]">
          Overview
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-muted-foreground">
          <span>{businessDate}</span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              isLive ? "text-success" : "text-faint"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                isLive ? "bg-success animate-dot-pulse" : "bg-faint"
              )}
            />
            <span>{liveLabel}</span>
          </span>
        </div>
      </div>

      <div
        role="group"
        aria-label="Date range"
        className="inline-flex rounded-[10px] border border-hairline bg-surface-2 p-[3px]"
      >
        {(
          [
            { value: "today", label: "Today" },
            { value: "week", label: "Last 7 days" },
          ] as const
        ).map((item) => {
          const pressed = range === item.value
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onRangeChange(item.value)}
              className={cn(
                "h-8 rounded-[8px] px-[13px] text-[13px] font-medium whitespace-nowrap motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface-2",
                pressed
                  ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
