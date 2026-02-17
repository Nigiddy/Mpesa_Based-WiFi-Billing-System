"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Wifi } from "lucide-react"
import { SystemSettings } from "@/types/settings"

interface NetworkSettingsProps {
    settings: SystemSettings
    onUpdate: (key: keyof SystemSettings, value: any) => void
}

export const NetworkSettings = ({ settings, onUpdate }: NetworkSettingsProps) => {
    return (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Wifi className="h-5 w-5 mr-2" />
                    Network Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-slate-700 dark:text-slate-300">Max Concurrent Users</Label>
                    <Input
                        type="number"
                        value={settings.maxConcurrentUsers}
                        onChange={(e) => onUpdate("maxConcurrentUsers", Number.parseInt(e.target.value))}
                        className="mt-1 bg-white/50 dark:bg-slate-700/50"
                    />
                </div>
                <div>
                    <Label className="text-slate-700 dark:text-slate-300">Session Timeout (hours)</Label>
                    <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => onUpdate("sessionTimeout", Number.parseInt(e.target.value))}
                        className="mt-1 bg-white/50 dark:bg-slate-700/50"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label className="text-slate-700 dark:text-slate-300">Auto Disconnect Expired Users</Label>
                    <Button
                        variant={settings.autoDisconnect ? "default" : "outline"}
                        size="sm"
                        onClick={() => onUpdate("autoDisconnect", !settings.autoDisconnect)}
                    >
                        {settings.autoDisconnect ? "Enabled" : "Disabled"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
