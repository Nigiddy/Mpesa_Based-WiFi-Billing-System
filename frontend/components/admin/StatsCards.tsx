"use client"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Activity, DollarSign, TrendingUp } from "lucide-react"
import { SystemStats } from "@/lib/api"

const StatsCards = ({ stats }: { stats: SystemStats | null }) => {
  const defaultStats = {
    totalUsers: 0,
    activeUsers: 0,
    todayRevenue: 0,
    successRate: 0,
    pendingPayments: 0,
    blockedUsers: 0,
  }
  const currentStats = stats || defaultStats
  
  // Color mappings for Tailwind - must be static for build-time extraction
  const colorMap = {
    blue: { bg: 'bg-primary/10', text: 'text-primary', icon: 'text-primary' },
    green: { bg: 'bg-success/10', text: 'text-success', icon: 'text-success' },
    purple: { bg: 'bg-secondary/10', text: 'text-secondary', icon: 'text-secondary' },
    orange: { bg: 'bg-warning/10', text: 'text-warning', icon: 'text-warning' },
  } as const
  
  const statsConfig = [
    { title: "Total Users", value: currentStats.totalUsers.toLocaleString(), change: "+12%", icon: Users, colorKey: "blue" as const },
    { title: "Active Sessions", value: currentStats.activeUsers.toString(), change: "+5%", icon: Activity, colorKey: "green" as const },
    { title: "Today's Revenue", value: `Ksh ${currentStats.todayRevenue.toLocaleString()}`, change: "+18%", icon: DollarSign, colorKey: "purple" as const },
    { title: "Success Rate", value: `${currentStats.successRate.toFixed(1)}%`, change: "+2.1%", icon: TrendingUp, colorKey: "orange" as const },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat, index) => {
        const colors = colorMap[stat.colorKey]
        return (
          <Card key={index} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-success dark:text-success">{stat.change} from yesterday</p>
                </div>
                <div className={`p-3 rounded-full ${colors.bg}`}>
                  <stat.icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
export default StatsCards;
