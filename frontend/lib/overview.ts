import { apiClient } from "@/lib/api"

export type OverviewRange = "today" | "week"
export type PaymentFilter = "all" | "paid" | "pending" | "failed"
export type StatusTone = "success" | "warning" | "danger" | "neutral"

// ─── Named threshold constants ────────────────────────────────────────────────

export const OVERVIEW_THRESHOLDS = {
  PENDING_TIMEOUT_SECONDS: 120,
  SSL_WARNING_DAYS: 14,
  SSL_DANGER_DAYS: 3,
  CALLBACK_PROMPT_WINDOW_MINUTES: 10,
  CALLBACK_SILENCE_WARNING_MINUTES: 5,
} as const

export const BUSINESS_TIMEZONE = "Africa/Nairobi"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SectionResult<T> {
  ok: boolean
  data?: T
  error?: string
}

export interface KpiData {
  range: OverviewRange
  isEmptyDay: boolean
  revenue: number
  comparisonRevenue: number
  revenueDeltaPct: number | null
  activeSessions: number
  todayPlansSold: number
  paidCount: number
  finishedCount: number
  successRate: number | null
  pendingCount: number
  oldestPendingAt: string | null
}

export interface ChartTodayData {
  range: "today"
  isEmpty: boolean
  currentHour: number
  todayRevenue: number
  yesterdayByNowRevenue: number
  revenueDeltaPct: number | null
  hourly: Array<number | null>
  yesterdayHourly: number[]
}

export interface ChartWeekDay {
  label: string
  fullLabel: string
  revenue: number
  isToday: boolean
}

export interface ChartWeekData {
  range: "week"
  isEmpty: boolean
  days: ChartWeekDay[]
}

export type ChartData = ChartTodayData | ChartWeekData

export interface LivePaymentRow {
  id: string
  requestedAt: string
  maskedPhone: string
  planName: string
  amount: number
  category: "paid" | "pending" | "failed"
  resultCode: number | null
  receipt: string | null
}

export interface LivePaymentsData {
  isEmpty: boolean
  counts: {
    all: number
    paid: number
    pending: number
    failed: number
  }
  rows: LivePaymentRow[]
}

export interface PlanSaleItem {
  key: string
  name: string
  price: number
  soldCount: number
  revenue: number
}

export interface PlanMixData {
  isEmpty: boolean
  totalSold: number
  totalRevenue: number
  plans: PlanSaleItem[]
}

export type HealthRowId = "mpesa" | "callbacks" | "router" | "database" | "ssl"

export interface HealthRowItem {
  id: HealthRowId
  status: "good" | "warning" | "danger"
  latencyMs?: number | null
  detail?: string | null
  lastCallbackAt?: string | null
  promptsLast10Min?: number
  callbacksLast5Min?: number
  connectedUsers?: number
  daysRemaining?: number
  validTo?: string
  host?: string
}

export interface HealthData {
  items: HealthRowItem[]
}

export interface AdminNotification {
  id: string
  title: string
  subtitle: string
  createdAt: string
  tone: "warning" | "neutral"
}

export interface OverviewPayload {
  generatedAt: string
  businessDate: string
  hasTodayPrompts: boolean | null
  kpis: SectionResult<KpiData>
  chart: SectionResult<ChartData>
  payments: SectionResult<LivePaymentsData>
  planMix: SectionResult<PlanMixData>
  health: SectionResult<HealthData>
  notifications: AdminNotification[]
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US")
}

export function formatKSh(value: number): string {
  return `KSh ${formatCount(value)}`
}

export function formatNairobiDate(date: Date = new Date()): string {
  const weekday = date.toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: BUSINESS_TIMEZONE,
  })
  const dayAndMonth = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: BUSINESS_TIMEZONE,
  })
  return `${weekday}, ${dayAndMonth}`
}

export function formatNairobiHHMM(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: BUSINESS_TIMEZONE,
  })
}

export function maskPhoneClient(raw: string): string {
  if (!raw) return "Unknown"
  if (raw.includes("•••")) return raw
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("254") && digits.length >= 12) {
    digits = "0" + digits.slice(3)
  } else if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) {
    digits = "0" + digits
  }
  if (digits.length >= 7) {
    return `${digits.slice(0, 4)} ••• ${digits.slice(-3)}`
  }
  return digits || "Unknown"
}

// ─── ResultCode status mapping ────────────────────────────────────────────────

export interface PaymentStatusDisplay {
  label: string
  tone: StatusTone
  pulsing: boolean
  category: "paid" | "pending" | "failed"
}

export function mapResultCodeToStatus(
  resultCode: number | null | undefined,
  requestedAtIso?: string,
  nowMs: number = Date.now()
): PaymentStatusDisplay {
  if (resultCode === 0) {
    return { label: "Paid", tone: "success", pulsing: false, category: "paid" }
  }
  if (resultCode === null || resultCode === undefined) {
    if (requestedAtIso) {
      const ageSec = (nowMs - new Date(requestedAtIso).getTime()) / 1000
      if (ageSec > OVERVIEW_THRESHOLDS.PENDING_TIMEOUT_SECONDS) {
        return { label: "Timed out", tone: "neutral", pulsing: false, category: "failed" }
      }
    }
    return { label: "Waiting for PIN", tone: "warning", pulsing: true, category: "pending" }
  }
  switch (Number(resultCode)) {
    case 1032:
      return { label: "Cancelled", tone: "danger", pulsing: false, category: "failed" }
    case 1:
      return { label: "Low balance", tone: "danger", pulsing: false, category: "failed" }
    case 1037:
      return { label: "Timed out", tone: "neutral", pulsing: false, category: "failed" }
    case 2001:
      return { label: "Wrong PIN", tone: "danger", pulsing: false, category: "failed" }
    default:
      return { label: "Failed", tone: "danger", pulsing: false, category: "failed" }
  }
}

// ─── Health evaluation & summary ──────────────────────────────────────────────

export function evaluateSslTone(daysRemaining: number): "good" | "warning" | "danger" {
  if (daysRemaining < OVERVIEW_THRESHOLDS.SSL_DANGER_DAYS) return "danger"
  if (daysRemaining < OVERVIEW_THRESHOLDS.SSL_WARNING_DAYS) return "warning"
  return "good"
}

export function evaluateCallbacksTone(
  promptsLast10Min: number,
  callbacksLast5Min: number
): "good" | "warning" {
  if (promptsLast10Min > 0 && callbacksLast5Min === 0) {
    return "warning"
  }
  return "good"
}

export function formatRelativeAge(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return "None yet today"
  const diffSec = Math.max(1, Math.round((nowMs - new Date(iso).getTime()) / 1000))
  if (diffSec < 60) return `Last ${diffSec}s ago`
  const mins = Math.round(diffSec / 60)
  if (mins < 60) return `Last ${mins} min ago`
  const hours = Math.round(mins / 60)
  return `Last ${hours}h ago`
}

export function getHealthSummaryTitle(items: HealthRowItem[]): string {
  if (!items.length) {
    return "No health checks configured."
  }

  const byId = new Map(items.map((item) => [item.id, item]))
  const mpesa = byId.get("mpesa")
  const database = byId.get("database")
  const router = byId.get("router")
  const ssl = byId.get("ssl")
  const callbacks = byId.get("callbacks")

  // Danger states first (highest severity)
  if (mpesa?.status === "danger") {
    return "The M-Pesa API isn't responding. New payments will fail."
  }
  if (database?.status === "danger") {
    return "The database isn't responding. New payments and logins will fail."
  }
  if (router?.status === "danger") {
    return "The hotspot router isn't responding. Paid devices can't get online."
  }
  if (ssl?.status === "danger") {
    const days = ssl.daysRemaining ?? 0
    return days <= 0
      ? "The SSL certificate has expired. Renew it immediately."
      : `The SSL certificate expires in ${days} day${days === 1 ? "" : "s"}. Renew it now.`
  }

  // Warning states next
  if (callbacks?.status === "warning") {
    return "Payment callbacks haven't arrived recently. M-Pesa confirmations may be delayed."
  }
  if (ssl?.status === "warning") {
    return "Everything is running. The SSL certificate needs renewing soon."
  }

  const anyWarning = items.find((i) => i.status === "warning")
  if (anyWarning) {
    return "One service needs attention."
  }

  return "Everything is running."
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

export async function getOverview(range: OverviewRange): Promise<OverviewPayload> {
  const response = await apiClient.getOverview(range)
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to load overview")
  }
  return response.data as OverviewPayload
}
