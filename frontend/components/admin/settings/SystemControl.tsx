"use client"

import { Switch } from "@/components/ui/switch"
import type { SystemSettings } from "@/lib/api"
import { SettingRow, SettingsSection } from "../admin-ui"

interface SystemControlProps {
  settings: SystemSettings
  onUpdate: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void
  /** Maintenance mode as last saved, so the row can say when a change is still waiting for Save */
  savedMaintenance?: boolean
}

/** Maintenance mode. Saved with the rest of the page by the save bar. */
export const SystemControl = ({ settings, onUpdate, savedMaintenance }: SystemControlProps) => {
  const on = Boolean(settings.maintenanceMode)
  const waitingForSave = savedMaintenance !== undefined && on !== Boolean(savedMaintenance)

  return (
    <SettingsSection id="maintenance" title="Maintenance" description="Pause new connections while you work on the network.">
      <SettingRow
        htmlFor="maintenance-mode"
        label="Maintenance mode"
        description={
          <>
            Stops new customers from connecting. People already online aren&rsquo;t affected.
            {waitingForSave && (
              <span className="mt-1 block font-medium text-foreground">{on ? "Turns on" : "Turns off"} when you save.</span>
            )}
          </>
        }
      >
        <Switch
          id="maintenance-mode"
          checked={on}
          onCheckedChange={(checked) => onUpdate("maintenanceMode", checked)}
          aria-describedby="maintenance-mode-desc"
          // Amber when on, because it affects customers
          className="data-[state=checked]:bg-[hsl(var(--warning))]"
        />
      </SettingRow>
    </SettingsSection>
  )
}
