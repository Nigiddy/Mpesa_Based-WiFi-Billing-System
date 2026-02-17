"use client"

import { useSystemSettings } from "@/hooks/useSystemSettings"
import { NetworkSettings } from "./settings/NetworkSettings"
import { PaymentSettings } from "./settings/PaymentSettings"
import { SystemControl } from "./settings/SystemControl"
import { QuickActions } from "./settings/QuickActions"
import { Skeleton } from "@/components/ui/skeleton"

const SystemSettings = () => {
  const {
    settings,
    loading,
    saving,
    updateSetting,
    saveSettings,
    restartNetworkService,
    backupDatabase,
    disconnectAllUsers,
  } = useSystemSettings()

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetworkSettings settings={settings} onUpdate={updateSetting} />
        <PaymentSettings settings={settings} onUpdate={updateSetting} />
        <SystemControl
          settings={settings}
          onUpdate={updateSetting}
          onSave={saveSettings}
          saving={saving}
        />
        <QuickActions
          onRestart={restartNetworkService}
          onBackup={backupDatabase}
          onDisconnectAll={disconnectAllUsers}
        />
      </div>
    </div>
  )
}

export default SystemSettings
