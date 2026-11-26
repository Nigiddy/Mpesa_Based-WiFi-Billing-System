"use client"

import { useState, useRef, lazy, Suspense, useEffect } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { wsClient } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import AdminHeader, { type AdminTabValue } from "@/components/admin/AdminHeader"
import { OverviewTab } from "@/components/admin/overview/OverviewTab"
import { useAuth } from "@/hooks/use-auth"
import { useOverview } from "@/hooks/use-overview"
import type { OverviewRange } from "@/lib/overview"

const UserManagement = lazy(() => import("@/components/admin/UserManagement"))
const PaymentManagement = lazy(() => import("@/components/admin/PaymentManagement"))
const SystemSettings = lazy(() => import("@/components/admin/SystemSettings"))
const VoucherManagement = lazy(() => import("@/components/admin/VoucherManagement"))

function TabPanelSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-12 w-48 rounded-xl" />
    </div>
  )
}

export default function AdminDashboard() {
  useDynamicTitle("Admin Dashboard - Qonnect")
  const [activeTab, setActiveTab] = useState<AdminTabValue>("overview")
  const [range, setRange] = useState<OverviewRange>("today")
  const { isAuthenticated } = useAuth()

  const visitedTabs = useRef<Set<AdminTabValue>>(new Set(["overview"]))

  const handleTabChange = (tab: AdminTabValue) => {
    visitedTabs.current.add(tab)
    setActiveTab(tab)
  }

  const overview = useOverview(range, isAuthenticated, activeTab === "overview")

  // Disconnect WebSocket cleanly on dashboard unmount
  useEffect(() => {
    return () => {
      wsClient.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader
        activeTab={activeTab}
        onTabChange={handleTabChange}
        notifications={overview.data?.notifications}
      />

      <main className="mx-auto w-full max-w-[1200px] px-[14px] pb-10 pt-[18px] sm:px-7 sm:pb-12 sm:pt-7">
        <Tabs
          value={activeTab}
          onValueChange={(v) => handleTabChange(v as AdminTabValue)}
        >
          <TabsContent value="overview" className="mt-0 outline-none">
            <OverviewTab
              range={range}
              onRangeChange={setRange}
              overview={overview}
              onViewAllPayments={() => handleTabChange("payments")}
            />
          </TabsContent>

          <TabsContent value="payments" className="mt-0 outline-none">
            {visitedTabs.current.has("payments") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <PaymentManagement />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="vouchers" className="mt-0 outline-none">
            {visitedTabs.current.has("vouchers") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <VoucherManagement />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-0 outline-none">
            {visitedTabs.current.has("users") && (
              <Suspense fallback={<TabPanelSkeleton />}>
                <UserManagement />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-0 outline-none">
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
