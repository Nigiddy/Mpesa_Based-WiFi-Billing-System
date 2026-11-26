"use client"

/**
 * Shared building blocks for the admin tabs (Payments, Vouchers, Users, Settings),
 * so every tab uses the same chips, status pills, empty states and pagination as the Overview.
 * Colors come from the tokens already in globals.css.
 */

import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react"
import { AlertCircle, AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const BUSINESS_TZ = "Africa/Nairobi"
export const FAINT = "text-[hsl(var(--faint-foreground))]"

/* ------------------------------------------------------------------ */
/* Formatting                                                           */
/* ------------------------------------------------------------------ */

/** 1234 → "KSh 1,234" */
export const formatKsh = (value: number | string | null | undefined) => {
  const n = Number(value)
  return `KSh ${Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "0"}`
}

/** "254712345678" / "0712345678" → "0712 345 678". Anything else is returned unchanged. */
export const formatPhone = (raw: string | null | undefined) => {
  if (!raw) return "–"
  let d = raw.replace(/\D/g, "")
  if (d.length === 12 && d.startsWith("254")) d = `0${d.slice(3)}`
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : raw
}

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit" })
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
const dayMonthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TZ, day: "numeric", month: "short" })
const dayMonthYearFmt = new Intl.DateTimeFormat("en-GB", { timeZone: BUSINESS_TZ, day: "numeric", month: "short", year: "numeric" })
const fullFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
})

/**
 * Times in Kenya time, whatever the admin's device is set to.
 * short: "Today 14:05", "Yesterday 09:12", "24 Nov, 18:40", "3 Dec 2025, 10:00"
 * full:  for tooltips and the details panel
 */
export function formatWhen(value: string | number | Date | null | undefined): { short: string; full: string } {
  if (value === null || value === undefined || value === "") return { short: "–", full: "" }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return { short: String(value), full: String(value) }

  const now = new Date()
  const key = dayKeyFmt.format(d)
  const today = dayKeyFmt.format(now)
  const yesterday = dayKeyFmt.format(new Date(now.getTime() - 864e5)) // EAT has no daylight saving
  const time = timeFmt.format(d)

  const short =
    key === today ? `Today ${time}`
    : key === yesterday ? `Yesterday ${time}`
    : key.slice(0, 4) === today.slice(0, 4) ? `${dayMonthFmt.format(d)}, ${time}`
    : `${dayMonthYearFmt.format(d)}, ${time}`

  return { short, full: `${fullFmt.format(d)} EAT` }
}

/* ------------------------------------------------------------------ */
/* Status                                                               */
/* ------------------------------------------------------------------ */

export type Tone = "success" | "warning" | "danger" | "neutral" | "info"

const TONES: Record<Tone, string> = {
  success: "bg-[var(--success-soft)] text-[hsl(var(--success))]",
  warning: "bg-[var(--warning-soft)] text-[hsl(var(--warning))]",
  danger: "bg-[var(--danger-soft)] text-[hsl(var(--danger))]",
  neutral: "bg-muted text-muted-foreground",
  info: "bg-[var(--accent-soft)] text-primary",
}

/** Color is always paired with a text label */
export function StatusPill({ tone, pulse, children }: { tone: Tone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium", TONES[tone])}>
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full bg-current", pulse && "animate-dot-pulse")} />
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Layout                                                               */
/* ------------------------------------------------------------------ */

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground sm:text-[26px]">{title}</h1>
        {description && <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Bordered panel, no shadow, same as the Overview */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)} {...rest} />
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

type ChipOption<T extends string> = { value: T; label: string; count?: number | null }

/** Filter chips. Counts appear only when they're known to be accurate. */
export function FilterChips<T extends string>({
  label, options, value, onChange,
}: { label: string; options: Array<ChipOption<T>>; value: T; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-input text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
          >
            {o.label}
            {o.count != null && (
              <span className={cn("tabular-nums", active ? "text-background/60" : FAINT)}>{o.count.toLocaleString("en-US")}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** "21–40 of 134 payments" when the total is known, otherwise "Page 2 of 7" */
export function Pagination({
  page, totalPages, total, pageSize, noun, onPageChange, disabled,
}: {
  page: number
  totalPages: number
  total: number | null
  pageSize: number
  noun: { one: string; many: string }
  onPageChange: (page: number) => void
  disabled?: boolean
}) {
  if (!total && totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const label =
    total != null
      ? `${from.toLocaleString("en-US")}–${Math.min(page * pageSize, total).toLocaleString("en-US")} of ${total.toLocaleString("en-US")} ${total === 1 ? noun.one : noun.many}`
      : `Page ${page} of ${totalPages}`

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
      <p className="text-[12.5px] tabular-nums text-muted-foreground">{label}</p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}

export function CopyValue({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <span className="-my-1 inline-flex min-w-0 items-center gap-1">
      <span className="min-w-0 break-all">{value}</span>
      <button
        type="button"
        onClick={async (e) => {
          e.stopPropagation()
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
          } catch {
            /* clipboard not available, e.g. on plain http */
          }
        }}
        aria-label={copied ? "Copied" : `Copy ${label ?? value}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* States                                                               */
/* ------------------------------------------------------------------ */

const SKELETON_WIDTHS = ["w-24", "w-28", "w-20", "w-16", "w-24", "w-32"]

/** Row-shaped placeholders, so the table doesn't jump when data arrives */
export function ListSkeleton({ rows = 6, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div role="status">
      <span className="sr-only">Loading</span>
      <div aria-hidden className="divide-y divide-border">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex h-[52px] items-center gap-6 px-4 sm:px-5">
            {Array.from({ length: columns }, (_, c) => (
              <Skeleton
                key={c}
                className={cn("h-3.5 rounded", SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length], c > 1 && "hidden md:block")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      {Icon && <Icon className={cn("mx-auto mb-3 h-7 w-7", FAINT)} aria-hidden />}
      <p className="text-[14.5px] font-semibold text-foreground">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ title, message, onRetry }: { title: string; message?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="px-6 py-14 text-center">
      <AlertCircle className="mx-auto mb-3 h-7 w-7 text-[hsl(var(--danger))]" aria-hidden />
      <p className="text-[14.5px] font-semibold text-foreground">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">{message}</p>}
      <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Settings                                                             */
/* ------------------------------------------------------------------ */

/** A titled group of setting rows. tone="danger" for actions that can't be undone. */
export function SettingsSection({
  id, title, description, tone, children,
}: { id: string; title: string; description?: ReactNode; tone?: "danger"; children: ReactNode }) {
  return (
    <Panel aria-labelledby={`${id}-title`} className={cn(tone === "danger" && "border-[hsl(var(--danger)/0.35)]")}>
      <header className="border-b border-border px-4 py-4 sm:px-5">
        <h2 id={`${id}-title`} className="text-[15.5px] font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
      </header>
      <div className="divide-y divide-border">{children}</div>
    </Panel>
  )
}

/**
 * One setting: label and description on the left, control on the right.
 * Pass htmlFor to link the label to its control; the description gets the id `${htmlFor}-desc`.
 * stack puts the control under the text on phones (for wide buttons).
 */
export function SettingRow({
  label, description, htmlFor, stack, children,
}: { label: string; description?: ReactNode; htmlFor?: string; stack?: boolean; children: ReactNode }) {
  const descId = htmlFor ? `${htmlFor}-desc` : undefined
  return (
    <div
      className={cn(
        "flex gap-4 px-4 py-4 sm:px-5",
        stack ? "flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6" : "items-center justify-between"
      )}
    >
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</label>
        ) : (
          <p className="text-sm font-medium text-foreground">{label}</p>
        )}
        {description && <div id={descId} className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/**
 * Whole-number setting with a unit, e.g. "180 seconds".
 * Only valid values reach onChange, so the page can never save an empty field or NaN.
 * A text input (not type="number") so scrolling over it can't change the value by accident.
 * If the admin leaves the field invalid, it goes back to the last valid value.
 */
export function NumberField({
  id, value, onChange, min, max, unit, describedBy,
}: {
  id: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  unit?: string
  describedBy?: string
}) {
  const show = (v: number) => (Number.isFinite(v) ? String(v) : "")
  const [text, setText] = useState(() => show(value))
  const [error, setError] = useState<string | null>(null)

  // Follow outside changes (Discard, a fresh load), but don't rewrite what's being typed
  useEffect(() => {
    setText((t) => (t.trim() !== "" && Number(t) === value ? t : show(value)))
    setError(null)
  }, [value])

  const validate = (t: string) => {
    const s = t.trim()
    if (s === "") return "Enter a number."
    const n = Number(s)
    if (!Number.isInteger(n)) return "Use a whole number."
    if (n < min || n > max) return `Use ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`
    return null
  }

  const errorId = `${id}-error`
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cn(
          "flex h-10 w-[9.5rem] items-center overflow-hidden rounded-[10px] border bg-card transition-[border-color,box-shadow]",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          error ? "border-[hsl(var(--danger))] focus-within:ring-[hsl(var(--danger)/0.3)]" : "border-input"
        )}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            const t = e.target.value.replace(/[^\d]/g, "")
            setText(t)
            const err = validate(t)
            setError(err)
            if (!err && Number(t) !== value) onChange(Number(t))
          }}
          onBlur={() => {
            if (error) {
              setText(show(value))
              setError(null)
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          // 16px on phones stops iOS zooming in
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-right text-base font-medium tabular-nums text-foreground outline-none sm:text-sm"
        />
        {unit && <span className="pr-3 text-[13px] text-muted-foreground">{unit}</span>}
      </div>
      {error && (
        <p id={errorId} role="alert" className="max-w-[12rem] text-right text-[12px] leading-snug text-[hsl(var(--danger))]">
          {error}
        </p>
      )}
    </div>
  )
}

/** Page-level warning banner, e.g. "Maintenance mode is on" */
export function Notice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--warning)/0.3)] bg-[var(--warning-soft)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex min-w-0 gap-3">
        <AlertTriangle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[hsl(var(--warning))]" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {children && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{children}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 pl-[30px] sm:pl-0">{action}</div>}
    </div>
  )
}
