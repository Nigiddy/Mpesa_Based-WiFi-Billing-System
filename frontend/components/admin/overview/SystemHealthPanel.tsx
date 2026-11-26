"use client"

import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatCount,
  formatRelativeAge,
  getHealthSummaryTitle,
  type HealthData,
  type HealthRowItem,
  type SectionResult,
} from "@/lib/overview"

interface SystemHealthPanelProps {
  section?: SectionResult<HealthData>
  isLoading: boolean
  nowMs: number
  onRetry: () => void
}

function renderRowCopy(
  item: HealthRowItem,
  nowMs: number
): {
  name: string
  description?: string
  value: string
  showRenew?: boolean
} {
  switch (item.id) {
    case "mpesa":
      return {
        name: "M-Pesa API (Daraja)",
        description: "STK push requests",
        value:
          item.status === "good"
            ? item.latencyMs != null
              ? `Working · ${item.latencyMs} ms`
              : "Working"
            : item.detail || "Not responding",
      }
    case "callbacks":
      return {
        name: "Payment callbacks",
        description: "Confirmations from M-Pesa",
        value: formatRelativeAge(item.lastCallbackAt, nowMs),
      }
    case "router":
      return {
        name: "Hotspot router",
        description: "Lets paid devices online",
        value:
          item.status === "good"
            ? `Online · ${formatCount(item.connectedUsers ?? 0)} devices`
            : "Unreachable",
      }
    case "database":
      return {
        name: "Database",
        value:
          item.status === "good"
            ? `Working · ${item.latencyMs ?? 0} ms`
            : "Unavailable",
      }
    case "ssl": {
      const days = item.daysRemaining ?? 0
      const expired = days <= 0
      const needsRenew = item.status === "warning" || item.status === "danger"
      return {
        name: "SSL certificate",
        description: expired
          ? "Certificate expired"
          : `Expires in ${days} day${days === 1 ? "" : "s"}`,
        value: needsRenew ? "" : `Valid · ${days}d`,
        showRenew: needsRenew,
      }
    }
  }
}

export function SystemHealthPanel({
  section,
  isLoading,
  nowMs,
  onRetry,
}: SystemHealthPanelProps) {
  if (isLoading && !section) {
    return (
      <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
        <Skeleton className="h-5 w-4/5 rounded" />
        <div className="mt-4 divide-y divide-hairline">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-4 w-20 rounded" />
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
            System health
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {section?.error || "Couldn't load system health."}
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

  const items = section.data.items
  const title = getHealthSummaryTitle(items)

  const handleRenewClick = (host?: string) => {
    toast.info("Renew SSL certificate", {
      description: host
        ? `Caddy manages TLS automatically for ${host}. Check your VPS Caddy logs or run cert renewal on the host.`
        : "Renew the TLS certificate on your reverse proxy / host.",
    })
  }

  return (
    <section className="min-w-0 rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <div className="mb-3.5">
        <h2 className="text-[15.5px] font-semibold leading-[1.35] tracking-[-0.01em] text-foreground">
          {title}
        </h2>
      </div>

      <ul className="divide-y divide-hairline">
        {items.map((item) => {
          const copy = renderRowCopy(item, nowMs)
          return (
            <li
              key={item.id}
              className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 py-[11px] text-[13.5px] first:pt-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-2 w-2 rounded-full",
                  item.status === "good" && "bg-success",
                  item.status === "warning" && "bg-warning",
                  item.status === "danger" && "bg-danger"
                )}
              />
              <div className="min-w-0">
                <div className="font-medium text-foreground">{copy.name}</div>
                {copy.description && (
                  <div className="text-[12px] text-muted-foreground">
                    {copy.description}
                  </div>
                )}
              </div>
              <div className="whitespace-nowrap text-right text-[12.5px] text-muted-foreground tabular-nums">
                {copy.showRenew ? (
                  <button
                    type="button"
                    onClick={() => handleRenewClick(item.host)}
                    className="h-[30px] rounded-lg border border-border-strong bg-surface px-[11px] text-[12.5px] font-semibold text-foreground transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Renew
                  </button>
                ) : (
                  copy.value
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
