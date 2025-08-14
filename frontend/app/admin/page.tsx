"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  CreditCard,
  Activity,
  Settings,
  Search,
  Download,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  UserX,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"
import { apiClient, type User, type Transaction, type SystemStats, wsClient } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"

// Header Component
const AdminHeader = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/20 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Qonnect Admin</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">Management Dashboard</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Back to Portal
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}

// Stats Cards Component
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

  const statsConfig = [
    {
      title: "Total Users",
      value: currentStats.totalUsers.toLocaleString(),
      change: "+12%",
      icon: Users,
      color: "blue",
    },
    {
      title: "Active Sessions",
      value: currentStats.activeUsers.toString(),
      change: "+5%",
      icon: Activity,
      color: "green",
    },
    {
      title: "Today's Revenue",
      value: `Ksh ${currentStats.todayRevenue.toLocaleString()}`,
      change: "+18%",
      icon: DollarSign,
      color: "purple",
    },
    {
      title: "Success Rate",
      value: `${currentStats.successRate.toFixed(1)}%`,
      change: "+2.1%",
      icon: TrendingUp,
      color: "orange",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat, index) => (
        <Card key={index} className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-green-600 dark:text-green-400">{stat.change} from yesterday</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-500/10`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchUsers()
  }, [searchTerm, statusFilter, currentPage])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getUsers({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 10,
      })

      if (response.success && response.data) {
        setUsers(response.data.users)
        setTotalPages(response.data.totalPages)
      } else {
        throw new Error(response.error || "Failed to fetch users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users", {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: "bg-green-500/10 text-green-600 dark:text-green-400", label: "Active" },
      expired: { color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", label: "Expired" },
      blocked: { color: "bg-red-500/10 text-red-600 dark:text-red-400", label: "Blocked" },
    }
    const config = statusConfig[status] || statusConfig.expired
    return <Badge className={`${config.color} border-0`}>{config.label}</Badge>
  }

  const handleUserAction = async (userId: number, action: string) => {
    try {
      let response
      const user = users.find((u) => u.id === userId)

      switch (action) {
        case "block":
          response = await apiClient.blockUser(userId)
          if (response.success) {
            toast.success("User blocked successfully", {
              description: `${user?.phone} has been blocked from accessing the network`,
            })
          }
          break
        case "unblock":
          response = await apiClient.unblockUser(userId)
          if (response.success) {
            toast.success("User unblocked successfully", {
              description: `${user?.phone} can now access the network`,
            })
          }
          break
        case "disconnect":
          response = await apiClient.disconnectUser(userId)
          if (response.success) {
            toast.success("User disconnected successfully", {
              description: `${user?.phone} has been disconnected from the network`,
            })
          }
          break
        case "delete":
          response = await apiClient.deleteUser(userId)
          if (response.success) {
            toast.success("User deleted successfully", {
              description: `${user?.phone} has been removed from the system`,
            })
          }
          break
      }

      if (response?.success) {
        fetchUsers() // Refresh the list
      } else {
        throw new Error(response?.error || "Action failed")
      }
    } catch (error) {
      toast.error("Action failed", {
        description: error.message,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by phone or MAC address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            toast.info("Exporting user data...", { duration: 2000 })
            // TODO: Implement export functionality
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Users Table */}
      <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-600 dark:text-slate-300">Phone</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">MAC Address</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Current Package</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Total Spent</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Last Seen</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-white">{user.phone}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {user.macAddress}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">
                        {user.currentPackage || "None"}
                      </TableCell>
                      <TableCell className="text-slate-900 dark:text-white font-medium">
                        Ksh {user.totalSpent}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{user.lastSeen}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                toast.info("Opening user details...", { duration: 2000 })
                                // TODO: Navigate to user details page or open modal
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUserAction(user.id, "disconnect")}>
                              <WifiOff className="h-4 w-4 mr-2" />
                              Disconnect
                            </DropdownMenuItem>
                            {user.status === "blocked" ? (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, "unblock")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Unblock User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, "block")}>
                                <UserX className="h-4 w-4 mr-2" />
                                Block User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (
                                  confirm("Are you sure you want to delete this user? This action cannot be undone.")
                                ) {
                                  handleUserAction(user.id, "delete")
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Payment Management Component
const PaymentManagement = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchTransactions()
  }, [searchTerm, statusFilter, currentPage])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getTransactions({
        search: searchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 10,
      })

      if (response.success && response.data) {
        setTransactions(response.data.transactions)
        setTotalPages(response.data.totalPages)
      } else {
        throw new Error(response.error || "Failed to fetch transactions")
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions", {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: "bg-green-500/10 text-green-600 dark:text-green-400", icon: CheckCircle },
      failed: { color: "bg-red-500/10 text-red-600 dark:text-red-400", icon: XCircle },
      pending: { color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", icon: Clock },
      refunded: { color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: RefreshCw },
    }
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <Badge className={`${config.color} border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleRefund = async (transactionId: string) => {
    try {
      const response = await apiClient.refundTransaction(transactionId, "Admin initiated refund")

      if (response.success) {
        const transaction = transactions.find((t) => t.id === transactionId)
        toast.success("Refund processed successfully", {
          description: `Ksh ${transaction?.amount} refunded to ${transaction?.phone}`,
        })
        fetchTransactions() // Refresh the list
      } else {
        throw new Error(response.error || "Refund failed")
      }
    } catch (error) {
      toast.error("Refund failed", {
        description: error.message,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by phone, transaction ID, or M-Pesa reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            toast.info("Exporting transaction data...", { duration: 2000 })
            // TODO: Implement export functionality
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Transactions Table */}
      <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Transactions ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-600 dark:text-slate-300">Transaction ID</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Phone</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Package</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Amount</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">M-Pesa Ref</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm text-slate-900 dark:text-white">
                        {transaction.id}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{transaction.phone}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{transaction.package}</TableCell>
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        Ksh {transaction.amount}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-600 dark:text-slate-400">
                        {transaction.mpesaRef}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{transaction.timestamp}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {transaction.status === "completed" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (
                                      confirm(
                                        "Are you sure you want to refund this transaction? This action cannot be undone.",
                                      )
                                    ) {
                                      handleRefund(transaction.id)
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Process Refund
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    try {
                                      const response = await apiClient.downloadReceipt(transaction.id)
                                      if (response.success && response.data) {
                                        window.open(response.data.receiptUrl, "_blank")
                                      }
                                    } catch (error) {
                                      toast.error("Failed to download receipt")
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Receipt
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// System Settings Component
const SystemSettings = () => {
  const [settings, setSettings] = useState({
    maxConcurrentUsers: 100,
    sessionTimeout: 24,
    autoDisconnect: true,
    maintenanceMode: false,
    mpesaTimeout: 60,
    defaultPackage: "24hours",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await apiClient.getSystemSettings()
      if (response.success && response.data) {
        setSettings(response.data)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    try {
      const response = await apiClient.updateSystemSettings(settings)
      if (response.success) {
        toast.success("Settings saved successfully", {
          description: "All system settings have been updated",
        })
      } else {
        throw new Error(response.error || "Failed to save settings")
      }
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error.message,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Settings */}
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
                onChange={(e) => handleSettingChange("maxConcurrentUsers", Number.parseInt(e.target.value))}
                className="mt-1 bg-white/50 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Session Timeout (hours)</Label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange("sessionTimeout", Number.parseInt(e.target.value))}
                className="mt-1 bg-white/50 dark:bg-slate-700/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 dark:text-slate-300">Auto Disconnect Expired Users</Label>
              <Button
                variant={settings.autoDisconnect ? "default" : "outline"}
                size="sm"
                onClick={() => handleSettingChange("autoDisconnect", !settings.autoDisconnect)}
              >
                {settings.autoDisconnect ? "Enabled" : "Disabled"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
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
                onChange={(e) => handleSettingChange("mpesaTimeout", Number.parseInt(e.target.value))}
                className="mt-1 bg-white/50 dark:bg-slate-700/50"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Default Package</Label>
              <Select
                value={settings.defaultPackage}
                onValueChange={(value) => handleSettingChange("defaultPackage", value)}
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

        {/* System Control */}
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
                onClick={() => handleSettingChange("maintenanceMode", !settings.maintenanceMode)}
              >
                {settings.maintenanceMode ? "Active" : "Inactive"}
              </Button>
            </div>
            <div className="pt-4 border-t border-slate-200 dark:border-white/10">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={saveSettings}>
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={async () => {
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
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Network Service
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={async () => {
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
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Backup Database
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={async () => {
                if (confirm("Are you sure you want to disconnect all users?")) {
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
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Disconnect All Users
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                if (confirm("Are you sure you want to perform a factory reset? This action cannot be undone.")) {
                  toast.error("Factory reset not implemented", {
                    description: "This is a dangerous operation that requires manual intervention",
                  })
                }
              }}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Factory Reset
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  useDynamicTitle("Admin Dashboard")
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState<SystemStats | null>(null)
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin/login')
    }
  }, [router])

  useEffect(() => {
    fetchStats()
    // Connect to WebSocket for real-time updates
    wsClient.connect()

    // Listen for real-time updates
    const handleUserConnected = (event: CustomEvent) => {
      toast.success("User connected", {
        description: `${event.detail.phone} is now online`,
      })
      fetchStats() // Refresh stats
    }

    const handleUserDisconnected = (event: CustomEvent) => {
      toast.info("User disconnected", {
        description: `${event.detail.phone} went offline`,
      })
      fetchStats() // Refresh stats
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
      const response = await apiClient.getSystemStats()
      if (response.success && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <AdminHeader />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage your WiFi billing system</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <StatsCards stats={stats} />

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-slate-900 dark:text-white">Network Service</span>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Online</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-slate-900 dark:text-white">M-Pesa Integration</span>
                        </div>
                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-slate-900 dark:text-white">Database</span>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Connected</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Pending Payments</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {stats?.pendingPayments || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Blocked Users</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{stats?.blockedUsers || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">System Uptime</span>
                        <span className="font-semibold text-slate-900 dark:text-white">99.9%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentManagement />
            </TabsContent>

            <TabsContent value="settings">
              <SystemSettings />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  )
}
