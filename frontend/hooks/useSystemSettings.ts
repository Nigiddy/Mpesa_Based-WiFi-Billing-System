"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { SystemSettings } from "@/types/settings"

export const useSystemSettings = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true)
            const response = await apiClient.getSystemSettings()
            if (response.success && response.data) {
                setSettings(response.data)
            } else {
                throw new Error(response.error || "Failed to fetch settings")
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
            toast.error("Failed to load settings", {
                description: "Please try refreshing the page",
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const updateSetting = useCallback((key: keyof SystemSettings, value: any) => {
        setSettings((prev) => (prev ? { ...prev, [key]: value } : null))
    }, [])

    const saveSettings = async () => {
        if (!settings) return

        try {
            setSaving(true)
            const response = await apiClient.updateSystemSettings(settings)
            if (response.success) {
                toast.success("Settings saved successfully", {
                    description: "All system settings have been updated",
                })
            } else {
                throw new Error(response.error || "Failed to save settings")
            }
        } catch (error: any) {
            toast.error("Failed to save settings", {
                description: error.message,
            })
        } finally {
            setSaving(false)
        }
    }

    const restartNetworkService = async () => {
        toast.loading("Restarting network service...", { id: "restart-service" })
        try {
            const response = await apiClient.restartNetworkService()
            if (response.success) {
                toast.success("Network service restarted successfully", { id: "restart-service" })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error("Failed to restart network service", { id: "restart-service" })
        }
    }

    const backupDatabase = async () => {
        toast.loading("Creating database backup...", { id: "backup-db" })
        try {
            const response = await apiClient.backupDatabase()
            if (response.success) {
                toast.success("Database backup completed", {
                    id: "backup-db",
                    description: "Backup saved to server storage",
                })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error("Failed to create backup", { id: "backup-db" })
        }
    }

    const disconnectAllUsers = async () => {
        toast.loading("Disconnecting all users...", { id: "disconnect-all" })
        try {
            const response = await apiClient.disconnectAllUsers()
            if (response.success) {
                toast.success("All users disconnected", { id: "disconnect-all" })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error("Failed to disconnect users", { id: "disconnect-all" })
        }
    }

    return {
        settings,
        loading,
        saving,
        updateSetting,
        saveSettings,
        restartNetworkService,
        backupDatabase,
        disconnectAllUsers,
    }
}
