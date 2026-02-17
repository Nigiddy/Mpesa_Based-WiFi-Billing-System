"use client"

import { useState, useEffect } from "react"
import { Activity, Users, CreditCard, Settings, BarChart3, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { apiClient, type SystemStats, wsClient } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import AdminHeader from "@/components/admin/AdminHeader"
import { useAuth } from "@/hooks/use-auth"
import UserManagement from "@/components/admin/UserManagement"
import PaymentManagement from "@/components/admin/PaymentManagement"
import SystemSettings from "@/components/admin/SystemSettings"
import { toast } from "sonner"
import { motion } from "framer-motion"

// Note: Kept your custom imports that hold complex logic
import { RealtimeActivityFeed } from "@/components/AdminDashboardComponents"

export default function AdminDashboard() {
  useDynamicTitle("Admin Dashboard - Qonnect")
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [activityLog, setActivityLog] = useState<Array<any>>([])
  const [isLoading, setIsLoading] = useState(true)
  const { admin, logout } = useAuth()

  useEffect(() => {
    fetchStats()
    wsClient.connect()

    const handleUserConnected = (event: CustomEvent) => {
      toast.success(`${event.detail.phone} is now online`)
      addActivityLog({
        id: Date.now(),
        type: "user_connected",
        title: "User Connected",
        description: `${event.detail.phone} is now online`,
        timestamp: new Date().toLocaleTimeString(),
      })
      fetchStats()
    }

    const handleUserDisconnected = (event: CustomEvent) => {
      addActivityLog({
        id: Date.now(),
        type: "user_disconnected",
        title: "User Disconnected",
        description: `${event.detail.phone} went offline`,
        timestamp: new Date().toLocaleTimeString(),
      })
      fetchStats()
    }

    window.addEventListener("user_connected", handleUserConnected as EventListener)
    window.addEventListener("user_disconnected", handleUserDisconnected as EventListener)

    return () => {
      wsClient.disconnect()
      window.removeEventListener("user_connected", handleUserConnected as EventListener)
      window.removeEventListener("user_disconnected", handleUserDisconnected as EventListener)
    }
  }, [])

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

  const addActivityLog = (activity: any) => {
    setActivityLog((prev) => [activity, ...prev.slice(0, 9)])
  }

  // Helper for the clean stat cards
  const metrics = [
    { label: "Today's Revenue", value: `KSh ${(stats?.todayRevenue || 0).toLocaleString()}`, icon: BarChart3 },
    { label: "Active Users", value: stats?.activeUsers || 0, icon: Users },
    { label: "Pending Payments", value: stats?.pendingPayments || 0, icon: CreditCard },
    { label: "Success Rate", value: `${stats?.successRate || 100}%`, icon: PieChart },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader>
        {admin && (
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm font-medium text-muted-foreground">{admin.email}</span>
            <Button variant="secondary" size="sm" onClick={logout} className="h-8">
              Logout
            </Button>
          </div>
        )}
      </AdminHeader>

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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          
          {/* Minimalist Tabs */}
          <TabsList className="bg-transparent border-b border-border w-full justify-start h-auto p-0 rounded-none gap-6 overflow-x-auto">
            {[
              { value: "overview", icon: Activity, label: "Overview" },
              { value: "payments", icon: CreditCard, label: "Payments" },
              { value: "users", icon: Users, label: "Users" },
              { value: "settings", icon: Settings, label: "Settings" },
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
                      {isLoading ? "..." : metric.value}
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
                    {/* Assuming this component renders a simple list. If it has heavy styles inside, it may need refining too! */}
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
                      {[
                        { label: "API Response", value: "142ms", status: "good" },
                        { label: "Database", value: "Active", status: "good" },
                        { label: "M-Pesa API", value: "Connected", status: "good" },
                        { label: "SSL Status", value: "Valid", status: "good" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between py-3">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.status === "good" ? "bg-green-500" : "bg-yellow-500"}`} />
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

          {/* OTHER TABS */}
          <TabsContent value="payments" className="outline-none"><PaymentManagement /></TabsContent>
          <TabsContent value="users" className="outline-none"><UserManagement /></TabsContent>
          <TabsContent value="settings" className="outline-none"><SystemSettings /></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}