"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { SystemSettings } from "@/types/settings"

interface SystemControlProps {
    settings: SystemSettings
    onUpdate: (key: keyof SystemSettings, value: any) => void
    onSave: () => void
    saving: boolean
}

export const SystemControl = ({ settings, onUpdate, onSave, saving }: SystemControlProps) => {
    return (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    System Control
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-slate-700 dark:text-slate-300">Maintenance Mode</Label>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Disable new connections</p>
                    </div>
                    <Button
                        variant={settings.maintenanceMode ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => onUpdate("maintenanceMode", !settings.maintenanceMode)}
                    >
                        {settings.maintenanceMode ? "Active" : "Inactive"}
                    </Button>
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={onSave}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
