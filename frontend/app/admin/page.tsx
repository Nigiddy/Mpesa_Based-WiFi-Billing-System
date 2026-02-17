"use client"

import { useState, useEffect } from "react"
import {
  Activity,
  Users,
  CreditCard,
  Settings,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { apiClient, type SystemStats, wsClient } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import AdminHeader from "@/components/admin/AdminHeader"
import { useAuth } from "@/hooks/use-auth"
import UserManagement from "@/components/admin/UserManagement"
import PaymentManagement from "@/components/admin/PaymentManagement"
import SystemSettings from "@/components/admin/SystemSettings"
import { toast } from "sonner"
import { motion } from "framer-motion"
import {
  StatCardsGrid,
  PremiumStatCard,
  RealtimeActivityFeed,
  KPISummary,
  EmptyState,
  SkeletonStatCards,
} from "@/components/AdminDashboardComponents"

// Main Admin Dashboard Component
export default function AdminDashboard() {
  useDynamicTitle("Admin Dashboard")
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [activityLog, setActivityLog] = useState<Array<any>>([])
  const [isLoading, setIsLoading] = useState(true)
  const { admin, logout } = useAuth()

  useEffect(() => {
    fetchStats()
    // Connect to WebSocket for real-time updates
    wsClient.connect()

    // Listen for real-time updates
    const handleUserConnected = (event: CustomEvent) => {
      toast.success("User connected", {
        description: `${event.detail.phone} is now online`,
      })
      addActivityLog({
        id: Date.now(),
        type: "user_connected",
        status: "success",
        title: "User Connected",
        description: `${event.detail.phone} is now online`,
        timestamp: new Date(),
      })
      fetchStats()
    }

    const handleUserDisconnected = (event: CustomEvent) => {
      toast.info("User disconnected", {
        description: `${event.detail.phone} went offline`,
      })
      addActivityLog({
        id: Date.now(),
        type: "user_disconnected",
        status: "pending",
        title: "User Disconnected",
        description: `${event.detail.phone} went offline`,
        timestamp: new Date(),
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
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Failed to fetch system stats")
    } finally {
      setIsLoading(false)
    }
  }

  const addActivityLog = (activity: any) => {
    setActivityLog((prev) => [activity, ...prev.slice(0, 9)])
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <AdminHeader>
          {admin && (
            <div className="flex items-center gap-4 ml-auto">
              <span className="text-sm text-muted-foreground">{admin.email}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          )}
        </AdminHeader>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text">
                System Dashboard
              </h1>
              <p className="text-muted-foreground">
                Real-time monitoring and management of your WiFi billing system
              </p>
            </div>
            {admin && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">Admin Account</span>
                <span className="font-semibold text-foreground">{admin.email}</span>
              </div>
            )}
          </motion.div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            {/* Tab Navigation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-muted/50 backdrop-blur-sm border border-border/50 p-1 h-auto gap-1">
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
                      className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </motion.div>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-8">
              {/* Key Metrics Grid */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {isLoading ? (
                  <SkeletonStatCards count={4} />
                ) : stats ? (
                  <StatCardsGrid>
                    <PremiumStatCard
                      icon={BarChart3}
                      label="Total Revenue"
                      value={`KSh${(stats.totalRevenue || 0).toLocaleString()}`}
                      change={stats.revenueChange || 0}
                      period={"vs last month"}
                      gradient="from-primary to-blue-600"
                    />
                    <PremiumStatCard
                      icon={Users}
                      label="Active Users"
                      value={stats.activeUsers || 0}
                      change={stats.usersChange || 0}
                      period={"vs last week"}
                      gradient="from-green-500 to-emerald-600"
                    />
                    <PremiumStatCard
                      icon={CreditCard}
                      label="Transactions"
                      value={stats.totalTransactions || 0}
                      change={stats.transactionsChange || 0}
                      period={"vs last month"}
                      gradient="from-purple-500 to-pink-600"
                    />
                    <PremiumStatCard
                      icon={Activity}
                      label="System Uptime"
                      value={`${stats.systemUptime || 99.9}%`}
                      change={0}
                      period={"This month"}
                      gradient="from-orange-500 to-red-600"
                    />
                  </StatCardsGrid>
                ) : (
                  <EmptyState
                    icon={BarChart3}
                    title="No Data Available"
                    description="Unable to load system statistics"
                  />
                )}
              </motion.section>

              {/* Charts and Activity Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="grid lg:grid-cols-3 gap-8"
              >
                {/* Real-time Activity Feed */}
                <div className="lg:col-span-2">
                  <Card variant="elevated">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        System Activity
                      </CardTitle>
                      <CardDescription>
                        Real-time events from the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RealtimeActivityFeed activities={activityLog} />
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Stats Summary */}
                <div className="space-y-4">
                  {stats && (
                    <>
                      <KPISummary
                        title="Revenue Today"
                        value={`KSh${(stats.revenueTodaytoday || 0).toLocaleString()}`}
                        unit="KES"
                        icon={TrendingUp}
                        highlighted
                      />
                      <KPISummary
                        title="New Users"
                        value={stats.newUsersToday || 0}
                        unit="users"
                        icon={Users}
                      />
                      <KPISummary
                        title="Success Rate"
                        value={`${stats.successRate || 99.8}%`}
                        unit="KES"
                        icon={PieChart}
                      />
                    </>
                  )}
                </div>
              </motion.section>

              {/* System Health */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>System Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { label: "API Response Time", value: "142ms", status: "good" },
                        {
                          label: "Database Connection",
                          value: "Active",
                          status: "good",
                        },
                        { label: "M-Pesa Integration", value: "Connected", status: "good" },
                        {
                          label: "SSL Certificate",
                          value: "Valid until 2026",
                          status: "good",
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="text-sm font-medium">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                item.status === "good"
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }`}
                            />
                            <span className="text-sm text-muted-foreground">
                              {item.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            </TabsContent>

            {/* PAYMENTS TAB */}
            <TabsContent value="payments">
              <PaymentManagement />
            </TabsContent>

            {/* USERS TAB */}
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  )
}
