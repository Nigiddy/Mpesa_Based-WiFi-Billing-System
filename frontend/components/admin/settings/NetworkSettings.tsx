"use client"

import { Switch } from "@/components/ui/switch"
import type { SystemSettings } from "@/lib/api"
import { NumberField, SettingRow, SettingsSection } from "../admin-ui"

interface NetworkSettingsProps {
  settings: SystemSettings
  onUpdate: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void
}

/** Allowed ranges. Adjust to what your router and backend accept. */
const LIMITS = {
  maxConcurrentUsers: { min: 1, max: 10000 },
  sessionTimeout: { min: 1, max: 168 }, // hours, up to a week
}

export const NetworkSettings = ({ settings, onUpdate }: NetworkSettingsProps) => {
  const autoDisconnect = Boolean(settings.autoDisconnect)

  return (
    <SettingsSection id="network" title="Network" description="Limits for the hotspot and what happens when a plan runs out.">
      <SettingRow
        htmlFor="max-users"
        label="Maximum devices online"
        description="The most devices that can be connected at the same time."
      >
        <NumberField
          id="max-users"
          value={Number(settings.maxConcurrentUsers)}
          onChange={(v) => onUpdate("maxConcurrentUsers", v as SystemSettings["maxConcurrentUsers"])}
          {...LIMITS.maxConcurrentUsers}
          unit="devices"
          describedBy="max-users-desc"
        />
      </SettingRow>

      <SettingRow
        htmlFor="session-timeout"
        label="Session limit"
        description="Longest a single connection can stay open before the customer has to reconnect."
      >
        <NumberField
          id="session-timeout"
          value={Number(settings.sessionTimeout)}
          onChange={(v) => onUpdate("sessionTimeout", v as SystemSettings["sessionTimeout"])}
          {...LIMITS.sessionTimeout}
          unit="hours"
          describedBy="session-timeout-desc"
        />
      </SettingRow>

      <SettingRow
        htmlFor="auto-disconnect"
        label="Disconnect when a plan ends"
        description={
          autoDisconnect ? (
            "Customers are cut off as soon as their plan time runs out."
          ) : (
            <>
              Customers are cut off as soon as their plan time runs out.
              <span className="mt-1 block font-medium text-[hsl(var(--warning))]">
                Off: people stay online after their plan ends.
              </span>
            </>
          )
        }
      >
        <Switch
          id="auto-disconnect"
          checked={autoDisconnect}
          onCheckedChange={(checked) => onUpdate("autoDisconnect", checked as SystemSettings["autoDisconnect"])}
          aria-describedby="auto-disconnect-desc"
        />
      </SettingRow>
    </SettingsSection>
  )
}
