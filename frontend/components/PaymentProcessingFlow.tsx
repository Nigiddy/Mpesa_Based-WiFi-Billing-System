'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Check, Clock, Copy, KeyRound, Loader2, Smartphone, Wallet, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type PaymentStage = 'initializing' | 'stk_sent' | 'waiting' | 'success' | 'failed' | 'timeout'

export interface PaymentProcessingProps {
  stage: PaymentStage
  amount: number
  phone: string
  package: string
  duration: string
  transactionId?: string
  mpesaRef?: string
  wifiPassword?: string
  expiresAt?: string
  /** Seconds the customer has to approve the prompt. Keep it in step with the payment hook's own timeout. */
  stkExpiresIn?: number
  /** M-Pesa ResultCode from the callback, used to explain a failure (1032 cancelled, 1 low balance, 2001 wrong PIN, 1037 timed out) */
  resultCode?: number | string

  // Callbacks
  onRetry?: () => void
  onCancel?: () => void
  onSuccess?: () => void
  onFailed?: () => void
  /** Called once when the countdown runs out. The timeout screen shows either way. */
  onTimeout?: () => void
  /** Sends a new prompt. The "Resend prompt" link only appears when this is provided. */
  onResend?: () => void
}

/* ------------------------------------------------------------------ */
/* Constants and helpers                                                */
/* ------------------------------------------------------------------ */

const BUSINESS_TZ = 'Africa/Nairobi'
const RESEND_AFTER_SECONDS = 15
const LOW_SECONDS = 10
const RING_RADIUS = 54
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
const EASE = [0.2, 0.8, 0.2, 1] as const

const formatKsh = (n: number) => `KSh ${Math.round(n).toLocaleString('en-US')}`

/** "254712345678" or "0712345678" → "0712 345 678" */
const formatPhone = (raw: string) => {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('254')) d = `0${d.slice(3)}`
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : raw
}

/** "Fri 27 Nov, 11:20 am" in Kenya time, the same on every browser */
const formatEnd = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: BUSINESS_TZ,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} ${get('month')}, ${get('hour')}:${get('minute')} ${get('dayPeriod').toLowerCase()}`
}

/** 86399000 → "23:59:59" */
const formatTimeLeft = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

type Tone = 'success' | 'warning' | 'danger'
const TONE: Record<Tone, string> = {
  success: 'bg-[var(--success-soft)] text-[hsl(var(--success))]',
  warning: 'bg-[var(--warning-soft)] text-[hsl(var(--warning))]',
  danger: 'bg-[var(--danger-soft)] text-[hsl(var(--danger))]',
}

type Failure = { title: string; text: string; icon: LucideIcon; tone: Tone }
const FAILURES: Record<string, Failure> = {
  '1032': { title: 'Payment cancelled', text: "The prompt was dismissed on your phone. You haven't been charged.", icon: X, tone: 'danger' },
  '1': { title: 'Not enough M-Pesa balance', text: "Top up, or choose a shorter plan. You haven't been charged.", icon: Wallet, tone: 'warning' },
  '2001': { title: 'Wrong M-Pesa PIN', text: "The PIN didn't match, so you haven't been charged. Try again with the right PIN.", icon: KeyRound, tone: 'danger' },
}
const UNKNOWN_FAILURE: Failure = {
  title: "Payment didn't go through",
  text: "M-Pesa didn't confirm the payment. If you got an M-Pesa SMS anyway, contact support with the code from it.",
  icon: AlertCircle,
  tone: 'danger',
}

type View = 'initializing' | 'waiting' | 'success' | 'failed' | 'timeout'

/* ------------------------------------------------------------------ */
/* Flow                                                                 */
/* ------------------------------------------------------------------ */

export const PaymentProcessingFlow = (props: PaymentProcessingProps) => {
  const { stage, stkExpiresIn = 180, onTimeout, onResend, onRetry, onCancel, onSuccess } = props
  const reduceMotion = useReducedMotion()
  const isWaiting = stage === 'stk_sent' || stage === 'waiting'
  const total = Math.max(1, stkExpiresIn)

  // The countdown runs against a deadline, not by counting ticks. Phones pause timers in
  // background tabs, and customers leave this tab to answer the M-Pesa prompt.
  const [deadline, setDeadline] = useState<number | null>(null)
  const [sentAt, setSentAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const timedOut = useRef(false)

  const restartCountdown = useCallback(() => {
    const t = Date.now()
    timedOut.current = false
    setSentAt(t)
    setDeadline(t + total * 1000)
    setNow(t)
  }, [total])

  // Start fresh every time a prompt goes out (first try, retry or resend)
  useEffect(() => {
    if (isWaiting) restartCountdown()
    else setDeadline(null)
  }, [isWaiting, restartCountdown])

  useEffect(() => {
    if (deadline === null) return
    const tick = () => setNow(Date.now())
    const id = window.setInterval(tick, 500)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [deadline])

  const secondsLeft = deadline === null ? total : Math.max(0, Math.ceil((deadline - now) / 1000))
  const resendIn = sentAt === null ? 0 : Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000))
  const expired = isWaiting && deadline !== null && secondsLeft === 0

  // Notify the parent once, outside any state update
  const onTimeoutRef = useRef(onTimeout)
  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])
  useEffect(() => {
    if (expired && !timedOut.current) {
      timedOut.current = true
      onTimeoutRef.current?.()
    }
  }, [expired])

  const handleResend = useCallback(() => {
    restartCountdown()
    onResend?.()
  }, [restartCountdown, onResend])

  // Our countdown ran out but the parent is still waiting for the callback, so a late approval can still land
  const stillListening = expired
  const handleRetryAfterTimeout = stillListening
    ? () => {
        restartCountdown()
        ;(onResend ?? onRetry)?.()
      }
    : onRetry

  const resultKey = props.resultCode != null ? String(props.resultCode) : ''
  const view: View =
    stage === 'initializing' ? 'initializing'
    : isWaiting ? (expired ? 'timeout' : 'waiting')
    : stage === 'success' ? 'success'
    : stage === 'timeout' || resultKey === '1037' ? 'timeout'
    : 'failed'

  const phone = formatPhone(props.phone)
  const amount = formatKsh(props.amount)

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={view}
          aria-labelledby="payment-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="rounded-[18px] border border-border bg-card p-5 text-center shadow-[0_1px_2px_rgba(11,15,23,0.04),0_12px_32px_-18px_rgba(11,15,23,0.18)] sm:rounded-[20px] sm:p-6 dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.7)]"
        >
          {view === 'initializing' && <InitializingView />}

          {view === 'waiting' && (
            <WaitingView
              phone={phone}
              amount={amount}
              plan={props.package}
              secondsLeft={secondsLeft}
              total={total}
              resendIn={resendIn}
              onResend={onResend ? handleResend : undefined}
              onCancel={onCancel}
            />
          )}

          {view === 'success' && (
            <SuccessView
              plan={props.package}
              amount={amount}
              mpesaRef={props.mpesaRef}
              transactionId={props.transactionId}
              wifiPassword={props.wifiPassword}
              expiresAt={props.expiresAt}
              onSuccess={onSuccess}
              onCancel={onCancel}
            />
          )}

          {view === 'failed' && <FailedView failure={FAILURES[resultKey] ?? UNKNOWN_FAILURE} onRetry={onRetry} onCancel={onCancel} />}

          {view === 'timeout' && (
            <TimeoutView stillListening={stillListening} onRetry={handleRetryAfterTimeout} onCancel={onCancel} />
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Building blocks                                                      */
/* ------------------------------------------------------------------ */

/** Each screen's heading takes focus when it appears, so screen readers announce the new state */
const Title = ({ children }: { children: ReactNode }) => {
  const focusOnMount = useCallback((el: HTMLHeadingElement | null) => {
    el?.focus({ preventScroll: true })
  }, [])
  return (
    <h2
      ref={focusOnMount}
      id="payment-heading"
      tabIndex={-1}
      className="mt-[18px] text-[22px] font-semibold tracking-tight text-foreground outline-none"
    >
      {children}
    </h2>
  )
}

const Lead = ({ children }: { children: ReactNode }) => (
  <p className="mx-auto mt-1.5 max-w-[330px] text-[14.5px] leading-relaxed text-muted-foreground [&_b]:whitespace-nowrap [&_b]:font-semibold [&_b]:text-foreground">
    {children}
  </p>
)

const StatusIcon = ({ tone, children }: { tone: Tone | 'neutral'; children: ReactNode }) => (
  <div
    className={cn(
      'mx-auto mt-1 grid h-16 w-16 place-items-center rounded-full',
      tone === 'neutral' ? 'bg-muted text-foreground' : TONE[tone]
    )}
  >
    {children}
  </div>
)

type Row = { label: string; value: ReactNode; mono?: boolean }
const Summary = ({ rows }: { rows: Array<Row | null | undefined | false> }) => (
  <dl className="mt-5 border-t border-border text-left">
    {rows
      .filter((r): r is Row => Boolean(r))
      .map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-b-0">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className={cn('min-w-0 text-right font-semibold tabular-nums text-foreground', r.mono && 'font-mono font-medium tracking-wide')}>
            {r.value}
          </dd>
        </div>
      ))}
  </dl>
)

const LinkButton = ({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      'rounded-sm text-[13.5px] font-medium text-primary underline-offset-[3px] hover:underline',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:cursor-default disabled:text-[hsl(var(--faint-foreground))] disabled:no-underline',
      className
    )}
    {...rest}
  />
)

const BUTTON = 'h-[50px] w-full rounded-xl text-[15px] font-semibold'

const Actions = ({ onRetry, onCancel, retryLabel = 'Try again' }: { onRetry?: () => void; onCancel?: () => void; retryLabel?: string }) =>
  onRetry || onCancel ? (
    <div className="mt-5 grid gap-2.5">
      {onRetry && (
        <Button type="button" onClick={onRetry} className={BUTTON}>
          {retryLabel}
        </Button>
      )}
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} className={BUTTON}>
          Change plan or number
        </Button>
      )}
    </div>
  ) : null

const PendingDot = () => (
  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[hsl(var(--warning))] animate-dot-pulse" />
)

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1600)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <span className="-my-1 inline-flex items-center gap-1">
      <span className="truncate">{value}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
          } catch {
            /* clipboard not available, e.g. on plain http */
          }
        }}
        aria-label={copied ? 'Copied' : `Copy ${value}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Screens                                                              */
/* ------------------------------------------------------------------ */

function InitializingView() {
  return (
    <>
      <StatusIcon tone="neutral">
        <Loader2 className="h-7 w-7 motion-safe:animate-spin" aria-hidden />
      </StatusIcon>
      <Title>Sending the prompt</Title>
      <Lead>This takes a few seconds. Keep this page open.</Lead>
    </>
  )
}

function WaitingView({
  phone, amount, plan, secondsLeft, total, resendIn, onResend, onCancel,
}: {
  phone: string
  amount: string
  plan: string
  secondsLeft: number
  total: number
  resendIn: number
  onResend?: () => void
  onCancel?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const low = secondsLeft <= LOW_SECONDS

  return (
    <>
      <div className="relative mx-auto mt-1.5 h-[120px] w-[120px]">
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute inset-2 rounded-full bg-primary/10"
            animate={{ scale: [0.85, 1.25], opacity: [0.9, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="4" className="stroke-input" />
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - secondsLeft / total)}
            className={cn(
              'transition-[stroke-dashoffset,stroke] duration-500 ease-linear',
              low ? 'stroke-[hsl(var(--warning))]' : 'stroke-primary'
            )}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center justify-items-center">
          <Smartphone className="mb-1 h-[26px] w-[26px] text-foreground" aria-hidden />
          <span className="font-mono text-[13px] tabular-nums text-muted-foreground" aria-hidden>
            {secondsLeft}s
          </span>
        </div>
      </div>

      <Title>Check your phone</Title>
      <Lead>
        We sent an M-Pesa prompt to <b>{phone}</b>. Enter your PIN to pay <b>{amount}</b>.
      </Lead>

      <Summary rows={[{ label: 'Plan', value: plan }, { label: 'Amount', value: amount }]} />

      {(onCancel || onResend) && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {onCancel ? <LinkButton onClick={onCancel}>Change number or plan</LinkButton> : <span />}
          {onResend && (
            <LinkButton onClick={onResend} disabled={resendIn > 0}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend prompt'}
            </LinkButton>
          )}
        </div>
      )}

      <p className="mt-3.5 flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
        <PendingDot />
        {low ? 'Still waiting' : 'Waiting for you to approve'}
      </p>
      {/* One announcement near the end instead of one every second */}
      <p className="sr-only" role="status">
        {low ? `${LOW_SECONDS} seconds left to approve the payment.` : ''}
      </p>
    </>
  )
}

function SuccessView({
  plan, amount, mpesaRef, transactionId, wifiPassword, expiresAt, onSuccess, onCancel,
}: {
  plan: string
  amount: string
  mpesaRef?: string
  transactionId?: string
  wifiPassword?: string
  expiresAt?: string
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const reduceMotion = useReducedMotion()
  const end = useMemo(() => {
    if (!expiresAt) return null
    const d = new Date(expiresAt)
    return Number.isNaN(d.getTime()) ? null : d
  }, [expiresAt])

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!end) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [end])

  const left = end ? end.getTime() - now : 0
  const ended = end !== null && left <= 0
  const reference = mpesaRef || transactionId

  return (
    <>
      <StatusIcon tone="success">
        <svg viewBox="0 0 24 24" className="h-[30px] w-[30px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path
            d="M20 6 9 17l-5-5"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
          />
        </svg>
      </StatusIcon>

      <Title>{ended ? 'Your session has ended' : "You're online"}</Title>
      <Lead>
        {!end ? 'This device is now connected.' : ended ? 'Buy a new plan to keep browsing.' : `Connected until ${formatEnd(end)}.`}
      </Lead>

      {end && !ended && (
        <>
          <div className="mt-[18px] font-mono text-[40px] font-medium leading-none tracking-tight tabular-nums text-foreground" aria-hidden>
            {formatTimeLeft(left)}
          </div>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">time left</p>
        </>
      )}

      <Summary
        rows={[
          reference && { label: mpesaRef ? 'M-Pesa receipt' : 'Reference', value: <CopyValue value={reference} />, mono: true },
          { label: 'Plan', value: plan },
          { label: 'Paid', value: amount },
          wifiPassword && { label: 'WiFi password', value: <CopyValue value={wifiPassword} />, mono: true },
        ]}
      />

      {ended && onCancel ? (
        <Button type="button" onClick={onCancel} className={cn(BUTTON, 'mt-5')}>
          Buy another plan
        </Button>
      ) : onSuccess ? (
        <Button type="button" onClick={onSuccess} className={cn(BUTTON, 'mt-5')}>
          Start browsing
        </Button>
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">You can close this page and start browsing.</p>
      )}
    </>
  )
}

function FailedView({ failure, onRetry, onCancel }: { failure: Failure; onRetry?: () => void; onCancel?: () => void }) {
  const Icon = failure.icon
  return (
    <>
      <StatusIcon tone={failure.tone}>
        <Icon className="h-[30px] w-[30px]" aria-hidden />
      </StatusIcon>
      <Title>{failure.title}</Title>
      <Lead>{failure.text}</Lead>
      <Actions onRetry={onRetry} onCancel={onCancel} />
    </>
  )
}

function TimeoutView({ stillListening, onRetry, onCancel }: { stillListening: boolean; onRetry?: () => void; onCancel?: () => void }) {
  return (
    <>
      <StatusIcon tone="warning">
        <Clock className="h-[30px] w-[30px]" aria-hidden />
      </StatusIcon>
      <Title>The prompt expired</Title>
      <Lead>We didn&rsquo;t get a reply from M-Pesa in time. If you didn&rsquo;t approve it, you haven&rsquo;t been charged.</Lead>
      {stillListening && (
        <p className="mx-auto mt-4 flex max-w-[340px] items-start gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-muted-foreground">
          <span className="mt-[7px]">
            <PendingDot />
          </span>
          <span>
            <span className="font-semibold text-foreground">Approved it just now?</span> Stay on this page. You&rsquo;ll be connected as soon as M-Pesa confirms.
          </span>
        </p>
      )}
      <Actions onRetry={onRetry} onCancel={onCancel} />
    </>
  )
}
