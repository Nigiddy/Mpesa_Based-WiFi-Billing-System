"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useSystemSettings } from "@/hooks/useSystemSettings"
import type { SystemSettings as Settings } from "@/lib/api"
import { cn } from "@/lib/utils"
import { NetworkSettings } from "./settings/NetworkSettings"
import { PaymentSettings } from "./settings/PaymentSettings"
import { SystemControl } from "./settings/SystemControl"
import { QuickActions } from "./settings/QuickActions"
import { ErrorState, Notice, PageHeader, Panel } from "./admin-ui"

/** JSON with sorted keys, so two copies of the same settings always compare equal */
const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "undefined"
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`).join(",")}}`
}

const SystemSettings = () => {
  const { settings, loading, saving, updateSetting, saveSettings, disconnectAllUsers } = useSystemSettings()
  const reduceMotion = useReducedMotion()

  // The settings as last saved on the server; edits are compared against this
  const [saved, setSaved] = useState<Settings | null>(null)
  const latest = useRef(settings)
  const rebase = useRef(false)

  useEffect(() => {
    latest.current = settings
  }, [settings])

  // First load
  useEffect(() => {
    if (settings && saved === null) setSaved(structuredClone(settings))
  }, [settings, saved])

  // After a save, the hook may swap in the server's copy. Take that as the new saved state.
  useEffect(() => {
    if (!rebase.current || !settings) return
    rebase.current = false
    setSaved(structuredClone(settings))
  }, [settings])

  const changed = useMemo(() => {
    if (!settings || !saved) return [] as Array<keyof Settings>
    const keys = new Set([...Object.keys(saved), ...Object.keys(settings)]) as Set<keyof Settings>
    return [...keys].filter((k) => stable(saved[k]) !== stable(settings[k]))
  }, [settings, saved])
  const dirty = changed.length > 0

  const handleSave = useCallback(async () => {
    if (saving || !dirty) return
    try {
      const result: unknown = await saveSettings()
      const failed =
        result === false ||
        (typeof result === "object" && result !== null && (result as { success?: unknown }).success === false)
      if (failed) return // keep the changes so nothing is lost
      if (latest.current) setSaved(structuredClone(latest.current))
      rebase.current = true
      window.setTimeout(() => { rebase.current = false }, 1000)
    } catch {
      // The hook reports the error. Keep the changes so the admin can try again.
    }
  }, [saving, dirty, saveSettings])

  const discard = () => {
    if (!saved) return
    changed.forEach((k) => updateSetting(k, saved[k]))
  }

  // Warn before leaving with unsaved changes; Ctrl/Cmd + S saves
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("keydown", onKey)
    }
  }, [dirty, handleSave])

  if (loading) return <SettingsSkeleton />

  if (!settings) {
    return (
      <div className="max-w-3xl space-y-5">
        <PageHeader title="Settings" />
        <Panel>
          {/* Reloads the page; swap in the hook's refetch if it has one */}
          <ErrorState title="Couldn't load settings." message="Check your connection and try again." onRetry={() => window.location.reload()} />
        </Panel>
      </div>
    )
  }

  const maintenanceChanged = changed.includes("maintenanceMode")
  const others = changed.length - (maintenanceChanged ? 1 : 0)
  const summary = maintenanceChanged
    ? `${settings.maintenanceMode ? "Saving turns maintenance mode on, so new customers can't connect." : "Saving turns maintenance mode off."}${
        others > 0 ? ` Plus ${others} other change${others === 1 ? "" : "s"}.` : ""
      }`
    : `${changed.length} setting${changed.length === 1 ? "" : "s"} changed.`

  return (
    <>
      <div className={cn("max-w-3xl space-y-5", dirty && "pb-32 sm:pb-24")}>
        <PageHeader title="Settings" description="Network, payment and maintenance settings. Changes apply when you save." />

        {saved?.maintenanceMode && (
          <Notice
            title="Maintenance mode is on"
            action={
              settings.maintenanceMode ? (
                <Button variant="outline" size="sm" className="bg-card" onClick={() => updateSetting("maintenanceMode", false)}>
                  Turn off
                </Button>
              ) : undefined
            }
          >
            New customers can&rsquo;t connect.{!settings.maintenanceMode && " It turns off when you save your changes."}
          </Notice>
        )}

        <NetworkSettings settings={settings} onUpdate={updateSetting} />
        <PaymentSettings settings={settings} onUpdate={updateSetting} />
        <SystemControl settings={settings} onUpdate={updateSetting} savedMaintenance={saved?.maintenanceMode} />
        <QuickActions onDisconnectAll={disconnectAllUsers} />
      </div>

      {/* Save bar: only while there are unsaved changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            key="save-bar"
            role="region"
            aria-label="Unsaved changes"
            initial={reduceMotion ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed inset-x-0 bottom-0 z-40 sm:bottom-5 sm:px-4"
          >
            <div className="mx-auto flex max-w-3xl flex-col gap-3 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_24px_-12px_rgba(11,15,23,0.2)] sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:p-3 sm:pl-5 sm:shadow-[0_18px_40px_-16px_rgba(11,15,23,0.35)]">
              <div className="min-w-0" aria-live="polite">
                <p className="text-sm font-semibold text-foreground">Unsaved changes</p>
                <p className="text-[13px] leading-snug text-muted-foreground">{summary}</p>
              </div>
              <div className="flex gap-2 sm:shrink-0">
                <Button variant="ghost" onClick={discard} disabled={saving} className="flex-1 sm:flex-none">
                  Discard
                </Button>
                <Button onClick={() => void handleSave()} disabled={saving} className="flex-1 gap-2 sm:flex-none">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Saving
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** Section-shaped placeholders, so nothing jumps when settings load */
function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-5" role="status">
      <span className="sr-only">Loading settings</span>
      <div aria-hidden className="space-y-2">
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>
      {[3, 2, 1, 1].map((rows, i) => (
        <div key={i} aria-hidden className="rounded-2xl border border-border bg-card">
          <div className="space-y-2 border-b border-border px-5 py-4">
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-3 w-56 max-w-full rounded" />
          </div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="flex items-center justify-between gap-6 border-b border-border px-5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40 rounded" />
                <Skeleton className="h-3 w-64 max-w-full rounded" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default SystemSettings
