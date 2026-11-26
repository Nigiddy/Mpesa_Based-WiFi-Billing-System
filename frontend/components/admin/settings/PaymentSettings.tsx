"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SystemSettings } from "@/lib/api"
import { NumberField, SettingRow, SettingsSection } from "../admin-ui"

interface PaymentSettingsProps {
  settings: SystemSettings
  onUpdate: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void
}

/** Seconds the portal waits for the customer to approve the M-Pesa prompt */
const MPESA_TIMEOUT = { min: 30, max: 300 }

/**
 * The values your backend stores for defaultPackage.
 * Prices are repeated here from your plans; keep them in step, or build this list from @/lib/packages.
 */
const PLAN_OPTIONS = [
  { value: "1hour", label: "1 Hour", price: 10 },
  { value: "4hours", label: "4 Hours", price: 15 },
  { value: "12hours", label: "12 Hours", price: 20 },
  { value: "24hours", label: "24 Hours", price: 30 },
]

export const PaymentSettings = ({ settings, onUpdate }: PaymentSettingsProps) => {
  const current = String(settings.defaultPackage ?? "")
  const known = PLAN_OPTIONS.some((p) => p.value === current)

  return (
    <SettingsSection id="payments" title="Payments" description="How the M-Pesa prompt and the portal's plan list behave.">
      <SettingRow
        htmlFor="mpesa-timeout"
        label="Time to approve the M-Pesa prompt"
        description="How long the portal waits for the customer's PIN before showing “The prompt expired”."
      >
        <NumberField
          id="mpesa-timeout"
          value={Number(settings.mpesaTimeout)}
          onChange={(v) => onUpdate("mpesaTimeout", v as SystemSettings["mpesaTimeout"])}
          {...MPESA_TIMEOUT}
          unit="seconds"
          describedBy="mpesa-timeout-desc"
        />
      </SettingRow>

      <SettingRow
        stack
        htmlFor="default-package"
        label="Default plan"
        description={
          <>
            The plan already selected when a customer opens the portal.
            {current && !known && (
              <span className="mt-1 block font-medium text-[hsl(var(--warning))]">
                The saved value “{current}” doesn&rsquo;t match any plan. Choose one.
              </span>
            )}
          </>
        }
      >
        <Select
          value={known ? current : undefined}
          onValueChange={(value) => onUpdate("defaultPackage", value as SystemSettings["defaultPackage"])}
        >
          <SelectTrigger id="default-package" aria-describedby="default-package-desc" className="h-10 w-full rounded-[10px] sm:w-56">
            <SelectValue placeholder="Choose a plan" />
          </SelectTrigger>
          <SelectContent>
            {PLAN_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <span className="flex w-full items-center justify-between gap-6">
                  <span>{p.label}</span>
                  <span className="tabular-nums text-muted-foreground">KSh {p.price.toLocaleString("en-US")}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingRow>
    </SettingsSection>
  )
}
