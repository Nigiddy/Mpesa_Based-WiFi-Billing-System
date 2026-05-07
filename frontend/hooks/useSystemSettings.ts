"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { apiClient, SystemSettings } from "@/lib/api"
import { MESSAGES } from "@/lib/constants/messages"

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
                throw new Error(response.error || MESSAGES.ERRORS.FETCH_SETTINGS)
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
            toast.error(MESSAGES.ERRORS.FETCH_SETTINGS, {
                description: "Please try refreshing the page",
            })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        fetchSettings().catch(() => {
            if (!cancelled) toast.error(MESSAGES.ERRORS.FETCH_SETTINGS)
        })
        return () => { cancelled = true }
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
                toast.success(MESSAGES.SUCCESS.SETTINGS_SAVED, {
                    description: "All system settings have been updated",
                })
            } else {
                throw new Error(response.error || MESSAGES.ERRORS.ACTION_FAILED)
            }
        } catch (error: unknown) {
            toast.error(MESSAGES.ERRORS.ACTION_FAILED, {
                description: error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR,
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
                toast.success(MESSAGES.SUCCESS.NETWORK_RESTARTED, { id: "restart-service" })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error(MESSAGES.ERRORS.ACTION_FAILED, { id: "restart-service" })
        }
    }

    const backupDatabase = async () => {
        toast.loading("Creating database backup...", { id: "backup-db" })
        try {
            const response = await apiClient.backupDatabase()
            if (response.success) {
                toast.success(MESSAGES.SUCCESS.DB_BACKUP, {
                    id: "backup-db",
                    description: "Backup saved to server storage",
                })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error(MESSAGES.ERRORS.ACTION_FAILED, { id: "backup-db" })
        }
    }

    const disconnectAllUsers = async () => {
        toast.loading("Disconnecting all users...", { id: "disconnect-all" })
        try {
            const response = await apiClient.disconnectAllUsers()
            if (response.success) {
                toast.success(MESSAGES.SUCCESS.ALL_USERS_DISCONNECTED, { id: "disconnect-all" })
            } else {
                throw new Error(response.error)
            }
        } catch (error) {
            toast.error(MESSAGES.ERRORS.ACTION_FAILED, { id: "disconnect-all" })
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
