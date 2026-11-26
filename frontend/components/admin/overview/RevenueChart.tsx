"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCount,
  formatKSh,
  type ChartData,
  type OverviewRange,
  type SectionResult,
} from "@/lib/overview"

interface RevenueChartProps {
  range: OverviewRange
  section?: SectionResult<ChartData>
  isLoading: boolean
  onRetry: () => void
}

interface BarDescriptor {
  label: string
  value: number
  isPartial: boolean
  isFuture: boolean
  yesterdayValue?: number
}

function niceMax(val: number): number {
  const safe = Math.max(val, 1)
  const mag = Math.pow(10, Math.floor(Math.log10(safe)))
  return Math.ceil(safe / mag / 2) * mag * 2 || 100
}

function formatAxisTick(val: number): string {
  if (val === 0) return "0"
  if (val >= 100) {
    const k = val / 1000
    return `${Number.isInteger(k) ? k : Number(k.toFixed(1))}k`
  }
  return String(Math.round(val))
}

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

export function RevenueChart({
  range,
  section,
  isLoading,
  onRetry,
}: RevenueChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 640, height: 230 })
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const update = () => {
      setSize({
        width: Math.max(280, el.clientWidth),
        height: el.clientHeight || 230,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setActiveIndex(null)
  }, [range])

  if (isLoading && !section) {
    return (
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="mt-2 h-3.5 w-28 rounded" />
        <Skeleton className="mt-4 h-[190px] w-full rounded-lg sm:h-[230px]" />
        <Skeleton className="mt-3 h-4 w-36 rounded" />
      </section>
    )
  }

  if (!section || !section.ok || !section.data) {
    return (
      <section className="flex min-w-0 flex-col justify-between rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <div>
          <h2 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">
            Revenue chart
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {section?.error || "Couldn't load revenue chart."}
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
  const W = size.width
  const Hh = size.height
  const padL = 44
  const padB = 22
  const padT = 8
  const iw = W - padL - 4
  const ih = Hh - padB - padT

  let title = ""
  let subtitle = ""
  let bars: BarDescriptor[] = []
  let xLabels: Array<{ index: number; text: string }> = []
  let yesterdayLine: number[] | null = null
  let maxVal = 100

  if (data.range === "today") {
    subtitle = "Revenue per hour"
    if (data.isEmpty) {
      title = "No revenue yet today"
    } else if (data.revenueDeltaPct === null) {
      title = `${formatKSh(data.todayRevenue)} so far today`
    } else {
      const pct = Math.abs(data.revenueDeltaPct).toFixed(0)
      const dir = data.revenueDeltaPct >= 0 ? "ahead of" : "behind"
      title = `${formatKSh(data.todayRevenue)} so far today, ${pct}% ${dir} yesterday at this time`
    }

    bars = data.hourly.map((v, h) => ({
      label: `${pad2(h)}:00–${pad2((h + 1) % 24)}:00`,
      value: data.isEmpty ? 0 : v ?? 0,
      isPartial: h === data.currentHour,
      isFuture: v === null,
      yesterdayValue: data.yesterdayHourly[h] ?? 0,
    }))

    const maxSeries = Math.max(
      ...bars.map((b) => b.value),
      ...(data.isEmpty ? [0] : data.yesterdayHourly),
      100
    )
    maxVal = niceMax(maxSeries)
    xLabels = [0, 6, 12, 18, 23].map((h) => ({ index: h, text: pad2(h) }))
    yesterdayLine = data.isEmpty ? null : data.yesterdayHourly
  } else {
    subtitle = "Revenue per day"
    if (data.isEmpty) {
      title = "No revenue in the last 7 days"
    } else {
      const best = data.days.reduce((a, b) => (b.revenue > a.revenue ? b : a))
      title = `${best.fullLabel} ${best.isToday ? "is" : "was"} the best day this week, at ${formatKSh(best.revenue)}`
    }

    bars = data.days.map((d) => ({
      label: d.isToday ? `${d.fullLabel} (so far)` : d.fullLabel,
      value: d.revenue,
      isPartial: d.isToday,
      isFuture: false,
    }))

    const maxSeries = Math.max(...bars.map((b) => b.value), 100)
    maxVal = niceMax(maxSeries)
    xLabels = data.days.map((d, i) => ({ index: i, text: d.label }))
  }

  const n = Math.max(bars.length, 1)
  const slot = iw / n
  const bw = Math.max(3, Math.min(slot * 0.62, 46))
  const yPos = (v: number) => padT + ih - (v / maxVal) * ih

  let yesterdayPath = ""
  if (yesterdayLine) {
    yesterdayPath = yesterdayLine
      .map((v, i) => {
        const x0 = padL + i * slot
        const x1 = x0 + slot
        const yy = yPos(v)
        return `${i === 0 ? `M${x0} ${yy}` : `L${x0} ${yy}`}L${x1} ${yy}`
      })
      .join("")
  }

  const activeBar = activeIndex !== null ? bars[activeIndex] : null
  const tipLeft =
    activeIndex !== null
      ? Math.min(Math.max(padL + activeIndex * slot + slot / 2, 70), W - 70)
      : 0
  const tipTop =
    activeBar !== null
      ? yPos(
          Math.max(
            activeBar.value,
            yesterdayLine && activeIndex !== null ? yesterdayLine[activeIndex] ?? 0 : 0
          )
        ) - 8
      : 0

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          <p className="mt-[3px] text-[12.5px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mt-1.5 h-[190px] sm:h-[230px]"
      >
        <svg
          viewBox={`0 0 ${W} ${Hh}`}
          className="block h-full w-full overflow-visible"
          role="img"
          aria-label={title}
        >
          {/* Horizontal gridlines at 0, 50%, 100% */}
          {[0, 0.5, 1].map((frac) => {
            const yy = padT + ih - frac * ih
            return (
              <g key={frac}>
                <line
                  x1={padL}
                  x2={W}
                  y1={yy}
                  y2={yy}
                  stroke="var(--border-hairline)"
                />
                <text
                  x={padL - 8}
                  y={yy + 4}
                  textAnchor="end"
                  className="fill-faint font-mono text-[11px]"
                >
                  {formatAxisTick(maxVal * frac)}
                </text>
              </g>
            )
          })}

          {/* Bars */}
          {bars.map((b, i) => {
            const x = padL + i * slot + (slot - bw) / 2
            if (b.isFuture) {
              return (
                <rect
                  key={i}
                  x={x}
                  y={padT + ih - 2}
                  width={bw}
                  height={2}
                  rx={1}
                  fill="var(--border-strong)"
                />
              )
            }
            const h = Math.max(b.value > 0 ? 2 : 0, (b.value / maxVal) * ih)
            const isDimmed = activeIndex !== null && activeIndex !== i
            const opacity = isDimmed ? 0.35 : b.isPartial ? 0.55 : 1

            return (
              <rect
                key={i}
                x={x}
                y={padT + ih - h}
                width={bw}
                height={h}
                rx={Math.min(4, bw / 3)}
                fill="hsl(var(--primary))"
                style={{ opacity }}
                className="motion-safe:transition-opacity motion-safe:duration-150"
              />
            )
          })}

          {/* Yesterday dashed stepped line */}
          {yesterdayPath && (
            <path
              d={yesterdayPath}
              fill="none"
              stroke="hsl(var(--faint-foreground))"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          {/* X-axis labels */}
          {xLabels.map((l) => (
            <text
              key={l.index}
              x={padL + l.index * slot + slot / 2}
              y={Hh - 4}
              textAnchor="middle"
              className="fill-faint font-mono text-[11px]"
            >
              {l.text}
            </text>
          ))}

          {/* Interactive hover/focus hit targets */}
          {!data.isEmpty &&
            bars.map((b, i) => {
              if (b.isFuture) return null
              return (
                <rect
                  key={`hit-${i}`}
                  x={padL + i * slot}
                  y={padT}
                  width={slot}
                  height={ih}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.label}: ${formatKSh(b.value)}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex((cur) => (cur === i ? null : cur))}
                  className="cursor-default focus:outline-none"
                />
              )
            })}
        </svg>

        {data.isEmpty && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-5 text-center text-[13.5px] text-muted-foreground">
            Payments will show here as they come in.
          </div>
        )}

        {/* Inverted tooltip */}
        {activeBar && !data.isEmpty && (
          <div
            role="tooltip"
            style={{
              left: `${tipLeft}px`,
              top: `${tipTop}px`,
              transform: "translate(-50%, -100%)",
            }}
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-[7px] text-[12px] leading-[1.4] text-background motion-safe:transition-opacity motion-safe:duration-150"
          >
            <div>{activeBar.label}</div>
            <div className="tabular-nums">
              <strong className="font-semibold">
                {formatKSh(activeBar.value)}
              </strong>
              {activeBar.isPartial && data.range === "today" ? " so far" : ""}
            </div>
            {yesterdayLine && activeIndex !== null && (
              <div className="tabular-nums opacity-85">
                Yesterday {formatKSh(yesterdayLine[activeIndex] ?? 0)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex gap-4 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[3px] bg-primary"
          />
          <span>{data.range === "today" ? "Today" : "Revenue"}</span>
        </span>
        {data.range === "today" && !data.isEmpty && (
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="h-0 w-3.5 border-t-[1.5px] border-dashed border-faint"
            />
            <span>Yesterday</span>
          </span>
        )}
      </div>
    </section>
  )
}
