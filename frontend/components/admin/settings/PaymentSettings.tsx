"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard } from "lucide-react"
import { SystemSettings } from "@/types/settings"

interface PaymentSettingsProps {
    settings: SystemSettings
    onUpdate: (key: keyof SystemSettings, value: any) => void
}

export const PaymentSettings = ({ settings, onUpdate }: PaymentSettingsProps) => {
    return (
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Settings
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label className="text-slate-700 dark:text-slate-300">M-Pesa Timeout (seconds)</Label>
                    <Input
                        type="number"
                        value={settings.mpesaTimeout}
                        onChange={(e) => onUpdate("mpesaTimeout", Number.parseInt(e.target.value))}
                        className="mt-1 bg-white/50 dark:bg-slate-700/50"
                    />
                </div>
                <div>
                    <Label className="text-slate-700 dark:text-slate-300">Default Package</Label>
                    <Select
                        value={settings.defaultPackage}
                        onValueChange={(value) => onUpdate("defaultPackage", value)}
                    >
                        <SelectTrigger className="mt-1 bg-white/50 dark:bg-slate-700/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1hour">1 Hour - Ksh 10</SelectItem>
                            <SelectItem value="4hours">4 Hours - Ksh 15</SelectItem>
                            <SelectItem value="12hours">12 Hours - Ksh 20</SelectItem>
                            <SelectItem value="24hours">24 Hours - Ksh 30</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    )
}
