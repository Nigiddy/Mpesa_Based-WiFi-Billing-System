"use client"

import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { AlertTriangle, Check, Loader2, Lock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { packages } from "@/lib/packages"
import { usePayment } from "@/hooks/use-payment"
import { PaymentProcessingFlow } from "@/components/PaymentProcessingFlow"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** `pkg.price` may be a number or a string such as "Ksh 30". This always returns the number. */
const toNumber = (value: unknown) => {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

/** Hours from labels like "1 Hour", "24 Hours", "2 Days", "1 Week". null if it can't tell. */
const hoursFromLabel = (label: string): number | null => {
  const m = label.match(/(\d+(?:\.\d+)?)\s*(min|hour|hr|day|week)/i)
  if (!m) return null
  const n = parseFloat(m[1])
  const unit = m[2].toLowerCase()
  if (unit.startsWith("min")) return n / 60
  if (unit.startsWith("day")) return n * 24
  if (unit.startsWith("week")) return n * 24 * 7
  return n
}

const formatKsh = (n: number) => `KSh ${n.toLocaleString("en-US")}`

const formatRate = (perHour: number) =>
  `KSh ${Number.isInteger(perHour) ? perHour : perHour.toFixed(2)} per hour`

/**
 * Normalises anything a customer might type or paste ("0712 345 678", "+254712345678",
 * "254712...", "712...") to the 10-digit "07..." format the payment hook expects.
 */
const normalisePhone = (raw: string) => {
  let digits = raw.replace(/\D/g, "")
  if (digits.startsWith("254")) digits = `0${digits.slice(3)}`
  else if (/^[17]/.test(digits)) digits = `0${digits}`
  return digits.slice(0, 10)
}

/** Kenyan mobile numbers: 07xx xxx xxx or 01xx xxx xxx */
const isValidPhone = (phone: string) => /^0[17]\d{8}$/.test(phone)

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function UserPortal() {
  useDynamicTitle("Instant WiFi Access - Qonnect")
  const reduceMotion = useReducedMotion()

  const {
    phone,
    amount,
    status,
    transactionId,
    paymentData,
    isLoading,
    macAddress,
    handlePhoneChange,
    setAmount,
    handlePayment,
    cancelPayment,
    retryPayment,
  } = usePayment()

  const [phoneTouched, setPhoneTouched] = useState(false)
  const planRefs = useRef<Array<HTMLButtonElement | null>>([])

  /** The first 4 packages, sorted shortest to longest, with price and hourly rate worked out */
  const plans = useMemo(() => {
    const list = packages.slice(0, 4).map((pkg) => {
      const price = toNumber(pkg.price)
      const hours = hoursFromLabel(pkg.label)
      return { pkg, price, hours, perHour: hours ? price / hours : null }
    })
    list.sort((a, b) => (a.hours ?? a.price) - (b.hours ?? b.price))
    // "Best value" is the lowest hourly rate, shown only when every plan has one
    const rated = list.filter((p) => p.perHour !== null)
    const best =
      rated.length > 1 && rated.length === list.length
        ? rated.reduce((a, b) => (b.perHour! < a.perHour! ? b : a))
        : null
    return list.map((p) => ({ ...p, best: p === best }))
  }, [])

  const selected = plans.find((p) => p.pkg.value === amount) ?? null
  const phoneOk = isValidPhone(phone)
  const showPhoneError = phoneTouched && phone.length > 0 && !phoneOk
  const canPay = !isLoading && !!selected && phoneOk

  // Remove this check if your hook never reports an unknown device as "UNAVAILABLE"
  const deviceUnknown = typeof macAddress === "string" && macAddress.toUpperCase() === "UNAVAILABLE"

  const paymentStage =
    status === "pending" ? "stk_sent"
    : status === "completed" ? "success"
    : status === "timeout" ? "timeout"
    : status === "failed" ? "failed"
    : null

  if (paymentStage) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-background px-4 py-12">
        <PaymentProcessingFlow
          stage={paymentStage}
          amount={amount}
          phone={`254${phone.substring(1)}`}
          package={selected?.pkg.label || "WiFi package"}
          duration={selected?.pkg.label || "Selected package"}
          transactionId={transactionId || undefined}
          mpesaRef={paymentData?.mpesaRef}
          expiresAt={paymentData?.expiresAt || undefined}
          onRetry={retryPayment}
          onCancel={cancelPayment}
          onTimeout={cancelPayment}
        />
      </div>
    )
  }

  /** Normalise the input, then hand it to the hook's existing handler unchanged */
  const onPhoneInput = (e: ChangeEvent<HTMLInputElement>) => {
    const next = normalisePhone(e.target.value)
    e.target.value = next
    handlePhoneChange(e)
    if (next.length === 10) setPhoneTouched(true)
  }

  /** Arrow keys move between plans, like a native radio group */
  const onPlanKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + plans.length) % plans.length
    planRefs.current[next]?.focus()
    setAmount(plans[next].pkg.value)
  }

  const payLabel = !selected
    ? "Choose a plan"
    : !phoneOk
      ? "Enter your M-Pesa number"
      : `Pay ${formatKsh(selected.price)} with M-Pesa`

  // Roving tabindex: only the selected plan (or the first one) is in the tab order
  const focusIndex = Math.max(0, plans.findIndex((p) => p.pkg.value === amount))

  return (
    <section className="bg-background">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mx-auto grid w-full max-w-5xl items-center gap-6 px-4 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20 lg:px-12 lg:py-20"
      >
        {/* Intro */}
        <div className="min-w-0">
          <h1 className="max-w-md text-[28px] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-4xl lg:text-[46px] lg:leading-[1.06]">
            Get online in under a minute.
          </h1>
          <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:mt-4 lg:text-[17px]">
            Pay with M-Pesa. This device connects as soon as your payment goes through.
          </p>

          <ol className="mt-9 hidden max-w-sm gap-[18px] lg:grid">
            {[
              ["Pick a plan", "From 1 hour to a full day."],
              ["Approve on your phone", "Enter your M-Pesa PIN in the prompt we send."],
              ["Start browsing", "No login or password needed."],
            ].map(([title, text], i) => (
              <li key={title} className="grid grid-cols-[30px_1fr] items-start gap-3.5">
                <span className="grid h-[30px] w-[30px] place-items-center rounded-full border border-input font-mono text-[13px] font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-foreground">{title}</p>
                  <p className="text-sm leading-normal text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Payment card */}
        <div className="min-w-0 rounded-[18px] border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(11,15,23,0.04),0_12px_32px_-18px_rgba(11,15,23,0.18)] sm:rounded-[20px] sm:p-[22px] dark:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.7)]">
          {deviceUnknown && (
            <div role="status" className="mb-5 flex gap-2.5 rounded-xl bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              <p>
                <span className="font-semibold text-foreground">We couldn&rsquo;t detect your device.</span>{" "}
                Make sure you&rsquo;re connected to the Qonnect WiFi, then reload this page.
              </p>
            </div>
          )}

          {/* 1. Plan */}
          <p id="plan-label" className="mb-2.5 text-[13.5px] font-semibold text-foreground">
            Choose a plan
          </p>
          <div role="radiogroup" aria-labelledby="plan-label" className="grid gap-2">
            {plans.map(({ pkg, price, perHour, best }, i) => {
              const checked = pkg.value === amount
              return (
                <button
                  key={pkg.value}
                  ref={(el) => { planRefs.current[i] = el }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={i === focusIndex ? 0 : -1}
                  onClick={() => setAmount(pkg.value)}
                  onKeyDown={(e) => onPlanKeyDown(e, i)}
                  className={cn(
                    "grid min-h-[62px] w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    checked
                      ? "border-primary bg-primary/[0.06] shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-input hover:border-muted-foreground/50"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full border-[1.5px] transition-colors",
                      checked ? "border-primary" : "border-input"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full bg-primary transition-transform duration-200",
                        checked ? "scale-100" : "scale-0"
                      )}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
                      {pkg.label}
                      {best && (
                        <span className="whitespace-nowrap rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400">
                          Best value
                        </span>
                      )}
                    </span>
                    {perHour !== null && (
                      <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{formatRate(perHour)}</span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-base font-semibold tabular-nums text-foreground">
                    <span className="mr-0.5 text-[0.72em] font-medium text-muted-foreground">KSh</span>
                    {price.toLocaleString("en-US")}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 2. Phone */}
          <Label htmlFor="phone" className="mb-2.5 mt-[22px] block text-[13.5px] font-semibold text-foreground">
            M-Pesa number
          </Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="0712 345 678"
              value={phone}
              onChange={onPhoneInput}
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={showPhoneError}
              aria-describedby="phone-help"
              // 16px text stops iOS Safari from zooming in when the field is focused
              className={cn(
                "h-[52px] rounded-xl bg-card pl-10 pr-10 text-base font-medium tabular-nums tracking-wide placeholder:font-normal placeholder:tracking-normal",
                showPhoneError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <Check
              aria-hidden
              className={cn(
                "pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-emerald-600 transition-[opacity,transform] duration-200 dark:text-emerald-400",
                phoneOk ? "scale-100 opacity-100" : "scale-75 opacity-0"
              )}
            />
          </div>
          <p
            id="phone-help"
            className={cn("mt-2 min-h-[19px] text-[12.5px] leading-normal", showPhoneError ? "text-destructive" : "text-muted-foreground")}
          >
            {showPhoneError
              ? phone.length < 10
                ? "This number looks too short. It should have 10 digits, like 0712 345 678."
                : "Numbers start with 07 or 01, like 0712 345 678."
              : "You'll get a prompt on this phone to enter your PIN."}
          </p>

          {/* 3. Pay */}
          <Button
            type="button"
            onClick={handlePayment}
            disabled={!canPay}
            className="mt-5 h-[50px] w-full rounded-xl text-[15px] font-semibold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" aria-hidden />
                Sending prompt
              </>
            ) : (
              payLabel
            )}
          </Button>

          <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[12.5px] text-muted-foreground">
            <Lock className="h-[13px] w-[13px] shrink-0" aria-hidden />
            M-Pesa handles the payment. We never see your PIN.
          </p>
        </div>
      </motion.div>
    </section>
  )
}
