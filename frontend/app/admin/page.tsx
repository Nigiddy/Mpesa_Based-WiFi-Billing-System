"use client"

import { useState, useEffect, useRef, lazy, Suspense } from "react"
import { Activity, Users, CreditCard, Settings, BarChart3, PieChart, Ticket } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient, type SystemStats, wsClient } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import AdminHeader from "@/components/admin/AdminHeader"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by apiClient.getHealthStatus() */
interface ServiceHealth {
  status: "good" | "warning" | "error" | "unknown"
  responseTime?: string
}

interface HealthStatus {
  api: ServiceHealth
  database: ServiceHealth
  mpesa: ServiceHealth
  ssl: ServiceHealth
}

// ─── Lazy-loaded tab panels ───────────────────────────────────────────────────
// Each heavy component is code-split so its JS bundle is only downloaded the
// first time the user opens that tab. Suspense provides a lightweight fallback.

const UserManagement    = lazy(() => import("@/components/admin/UserManagement"))
const PaymentManagement = lazy(() => import("@/components/admin/PaymentManagement"))
const SystemSettings    = lazy(() => import("@/components/admin/SystemSettings"))
const VoucherManagement = lazy(() => import("@/components/admin/VoucherManagement"))

// Shared skeleton fallback for lazy panels
function TabPanelSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  )
}

// Note: Kept ActivityFeed import — holds complex realtime logic
import { RealtimeActivityFeed } from "@/components/AdminDashboardComponents"

export default function AdminDashboard() {
  useDynamicTitle("Admin Dashboard - Qonnect")
  const [activeTab, setActiveTab]       = useState("overview")
  const [stats, setStats]               = useState<SystemStats | null>(null)
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [activityLog, setActivityLog]   = useState<Parameters<typeof RealtimeActivityFeed>[0]["activities"]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const { isAuthenticated } = useAuth()

  // Track which tabs have been visited so each panel mounts only once.
  // A Set stored in a ref avoids triggering re-renders when it updates.
  const visitedTabs = useRef<Set<string>>(new Set(["overview"]))

  const handleTabChange = (tab: string) => {
    visitedTabs.current.add(tab)
    setActiveTab(tab)
  }

  useEffect(() => {
    // Only initialize data fetching and WebSocket once the admin session is confirmed.
    if (!isAuthenticated) return

    fetchStats()
    fetchHealthStatus()
    // Guard against double-connect (Strict Mode double-mount, tab navigation, etc.)
    if (!wsClient.isConnected()) {
      wsClient.connect()
    }

    const handleUserConnected = (event: CustomEvent) => {
      toast.success(`${event.detail.phone} is now online`)
      addActivityLog({
        id: String(Date.now()),
        type: "connection",
        title: "User Connected",
        description: `${event.detail.phone} is now online`,
        timestamp: new Date().toLocaleTimeString(),
        icon: null,
        status: "success",
      })
      fetchStats()
    }

    const handleUserDisconnected = (event: CustomEvent) => {
      addActivityLog({
        id: String(Date.now()),
        type: "connection",
        title: "User Disconnected",
        description: `${event.detail.phone} went offline`,
        timestamp: new Date().toLocaleTimeString(),
        icon: null,
        status: "pending",
      })
      fetchStats()
    }

    window.addEventListener("user_connected", handleUserConnected as EventListener)
    window.addEventListener("user_disconnected", handleUserDisconnected as EventListener)

    // Refresh health status every 60 seconds (4 parallel calls — no need to hammer)
    const healthInterval = setInterval(() => {
      fetchHealthStatus()
    }, 60000)

    return () => {
      wsClient.disconnect()
      clearInterval(healthInterval)
      window.removeEventListener("user_connected", handleUserConnected as EventListener)
      window.removeEventListener("user_disconnected", handleUserDisconnected as EventListener)
    }
  }, [isAuthenticated])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getSystemStats()
      if (response.success && response.data) setStats(response.data)
    } catch (error) {
      toast.error("Failed to fetch system stats")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHealthStatus = async () => {
    try {
      const response = await apiClient.getHealthStatus()
      if (response.success) {
        setHealthStatus(response.data as HealthStatus)
      } else {
        // Non-throwing API failure — log so devs can see it in the console
        console.warn("[AdminDashboard] Health check returned failure:", response.error)
        setHealthStatus(null)
      }
    } catch (error) {
      console.warn("[AdminDashboard] Health check threw an exception:", error)
      setHealthStatus(null)
    }
  }

  const addActivityLog = (activity: Parameters<typeof RealtimeActivityFeed>[0]["activities"][number]) => {
    setActivityLog((prev) => [activity, ...prev.slice(0, 9)])
  }

  // Helper for the clean stat cards
  const metrics = [
    { label: "Today's Revenue", value: formatCurrency(stats?.todayRevenue || 0), icon: BarChart3 },
    { label: "Active Users",    value: stats?.activeUsers    || 0,               icon: Users },
    { label: "Pending Payments",value: stats?.pendingPayments || 0,              icon: CreditCard },
    { label: "Success Rate",    value: `${stats?.successRate || 100}%`,          icon: PieChart },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-7xl">
        
        {/* Clean Header */}
        <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor and manage your network in real-time.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
          
          {/* Minimalist Tabs */}
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none gap-6 overflow-x-auto">
            {[
              { value: "overview",  icon: Activity,   label: "Overview" },
              { value: "payments",  icon: CreditCard,  label: "Payments" },
              { value: "vouchers",  icon: Ticket,      label: "Vouchers" },
              { value: "users",     icon: Users,       label: "Users" },
              { value: "settings",  icon: Settings,    label: "Settings" },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-8 outline-none">
            
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {metrics.map((metric, i) => {
                const Icon = metric.icon
                return (
                  <div key={i} className="bg-card border border-border/50 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
                      <Icon className="w-4 h-4 text-primary/60" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {isLoading
                        ? <Skeleton className="h-8 w-24 rounded-md" />
                        : metric.value}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Layout Grid for Feed & Health */}
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              
              {/* Activity Feed */}
              <div className="lg:col-span-2">
                <Card className="border-border/50 shadow-sm h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Live Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RealtimeActivityFeed activities={activityLog} />
                  </CardContent>
                </Card>
              </div>

              {/* System Health */}
              <div>
                <Card className="border-border/50 shadow-sm h-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold">System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-0 divide-y divide-border/40">
                      {(healthStatus ? [
                        {
                          label: "API Response",
                          value: healthStatus.api?.responseTime || "Unknown",
                          status: healthStatus.api?.status || "warning",
                        },
                        {
                          label: "Database",
                          value: healthStatus.database?.status || "Unknown",
                          status: healthStatus.database?.status === "good" ? "good" : "warning",
                        },
                        {
                          label: "M-Pesa API",
                          value: healthStatus.mpesa?.status || "Unknown",
                          status: healthStatus.mpesa?.status === "good" ? "good" : "warning",
                        },
                        {
                          label: "SSL Status",
                          value: healthStatus.ssl?.status || "Unknown",
                          status: healthStatus.ssl?.status === "good" ? "good" : "warning",
                        },
                      ] : [
                        { label: "API Response", value: "Loading…", status: "warning" },
                        { label: "Database",     value: "Loading…", status: "warning" },
                        { label: "M-Pesa API",   value: "Loading…", status: "warning" },
                        { label: "SSL Status",   value: "Loading…", status: "warning" },
                      ]).map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.status === "good" ? "bg-green-500" : item.status === "warning" ? "bg-yellow-500" : "bg-red-500"}`} />
                            <span className="text-sm font-medium text-foreground">{item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* OTHER TABS — each panel mounts only when its tab is first visited.
              React.lazy + Suspense means the JS bundle for each panel is only
              downloaded on first open; after that it stays mounted (hidden by
              TabsContent) so data is not re-fetched on tab switch. */}
          <TabsContent value="payments" className="outline-none">
            {visitedTabs.current.has("payments") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <PaymentManagement />
              </Suspense>
            )}
          </TabsContent>
          <TabsContent value="vouchers" className="outline-none">
            {visitedTabs.current.has("vouchers") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <VoucherManagement />
              </Suspense>
            )}
          </TabsContent>
          <TabsContent value="users" className="outline-none">
            {visitedTabs.current.has("users") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <UserManagement />
              </Suspense>
            )}
          </TabsContent>
          <TabsContent value="settings" className="outline-none">
            {visitedTabs.current.has("settings") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <SystemSettings />
              </Suspense>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}