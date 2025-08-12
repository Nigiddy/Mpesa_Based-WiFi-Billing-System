// API configuration optimized for Node.js/Express backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaymentRequest {
  phone: string
  amount: number
  package: string
  macAddress: string
  speed: string
}

export interface PaymentResponse {
  transactionId: string
  mpesaRef: string
  status: "pending" | "completed" | "failed"
  expiresAt: string
}

export interface User {
  id: number
  phone: string
  macAddress: string
  status: "active" | "expired" | "blocked"
  currentPackage?: string
  expiresAt?: string
  totalSpent: number
  sessionsCount: number
  lastSeen: string
}

export interface Transaction {
  id: string
  phone: string
  amount: number
  package: string
  status: "completed" | "failed" | "pending" | "refunded"
  timestamp: string
  mpesaRef: string
  mpesaReceipt?: string
}

export interface SystemStats {
  totalUsers: number
  activeUsers: number
  todayRevenue: number
  successRate: number
  pendingPayments: number
  blockedUsers: number
}

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      // Get auth token for protected routes
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  // Device & Network APIs
  async getDeviceInfo(): Promise<ApiResponse<{ macAddress: string; ipAddress: string; deviceId: string }>> {
    return this.request("/api/device/info")
  }

  async registerDevice(macAddress: string): Promise<ApiResponse<{ deviceId: string }>> {
    return this.request("/api/device/register", {
      method: "POST",
      body: JSON.stringify({ macAddress }),
    })
  }

  // Payment APIs
  async initiatePayment(paymentData: PaymentRequest): Promise<ApiResponse<PaymentResponse>> {
    return this.request("/api/payments/initiate", {
      method: "POST",
      body: JSON.stringify(paymentData),
    })
  }

  async checkPaymentStatus(transactionId: string): Promise<ApiResponse<PaymentResponse>> {
    return this.request(`/api/payments/status/${transactionId}`)
  }

  async getPaymentHistory(phone: string): Promise<ApiResponse<Transaction[]>> {
    // Not implemented on backend
    return { success: false, error: "Not implemented" }
  }

  // User Management APIs
  async getUsers(params?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ users: User[]; total: number; page: number; totalPages: number }>> {
    // Derive users from admin payments list
    const paymentsResp = await this.request<Array<{ phone: string; amount: number; time_purchased: string; status: string }>>(
      "/api/admin/payments"
    )
    if (!paymentsResp.success || !paymentsResp.data) {
      return { success: false, error: paymentsResp.error || "Failed to load payments" }
    }
    // Aggregate by phone
    const phoneToAgg = new Map<string, User>()
    for (const p of paymentsResp.data) {
      const existing = phoneToAgg.get(p.phone)
      const updated: User = existing || {
        id: phoneToAgg.size + 1,
        phone: p.phone,
        macAddress: "",
        status: p.status === "confirmed" ? "active" : "expired",
        currentPackage: undefined,
        expiresAt: undefined,
        totalSpent: 0,
        sessionsCount: 0,
        lastSeen: p.time_purchased,
      }
      updated.totalSpent += Number(p.amount) || 0
      updated.sessionsCount += 1
      updated.status = updated.status === "active" || p.status === "confirmed" ? "active" : "expired"
      if (new Date(p.time_purchased) > new Date(updated.lastSeen)) {
        updated.lastSeen = p.time_purchased
      }
      phoneToAgg.set(p.phone, updated)
    }
    let users = Array.from(phoneToAgg.values())
    // Filters
    if (params?.search) {
      const q = params.search.toLowerCase()
      users = users.filter((u) => u.phone.toLowerCase().includes(q))
    }
    if (params?.status && params.status !== "all") {
      users = users.filter((u) => u.status === params.status)
    }
    // Pagination
    const page = params?.page || 1
    const limit = params?.limit || 10
    const total = users.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const paged = users.slice((page - 1) * limit, page * limit)
    return { success: true, data: { users: paged, total, page, totalPages } }
  }

  async getUserDetails(userId: number): Promise<ApiResponse<User & { transactions: Transaction[] }>> {
    return this.request(`/api/users/${userId}`)
  }

  async blockUser(userId: number): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/block`, { method: "POST" })
  }

  async unblockUser(userId: number): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/unblock`, { method: "POST" })
  }

  async deleteUser(userId: number): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}`, { method: "DELETE" })
  }

  async disconnectUser(userId: number): Promise<ApiResponse> {
    return this.request(`/api/users/${userId}/disconnect`, { method: "POST" })
  }

  // Transaction APIs
  async getTransactions(params?: {
    search?: string
    status?: string
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
  }): Promise<ApiResponse<{ transactions: Transaction[]; total: number; page: number; totalPages: number }>> {
    const paymentsResp = await this.request<Array<{ phone: string; amount: number; time_purchased: string; status: string }>>(
      "/api/admin/payments"
    )
    if (!paymentsResp.success || !paymentsResp.data) {
      return { success: false, error: paymentsResp.error || "Failed to load payments" }
    }
    let transactions: Transaction[] = paymentsResp.data.map((p, idx) => ({
      id: `${p.phone}-${new Date(p.time_purchased).getTime()}-${idx}`,
      phone: p.phone,
      amount: Number(p.amount) || 0,
      package: "",
      status: (p.status as Transaction["status"]) || "pending",
      timestamp: p.time_purchased,
      mpesaRef: "",
    }))
    // Filters
    if (params?.search) {
      const q = params.search.toLowerCase()
      transactions = transactions.filter(
        (t) => t.phone.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.mpesaRef || "").toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== "all") {
      transactions = transactions.filter((t) => t.status === params.status)
    }
    const page = params?.page || 1
    const limit = params?.limit || 10
    const total = transactions.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const paged = transactions.slice((page - 1) * limit, page * limit)
    return { success: true, data: { transactions: paged, total, page, totalPages } }
  }

  async refundTransaction(transactionId: string, reason?: string): Promise<ApiResponse> {
    return { success: false, error: "Refund API is not implemented" }
  }

  async downloadReceipt(transactionId: string): Promise<ApiResponse<{ receiptUrl: string }>> {
    return { success: false, error: "Receipt API is not implemented" }
  }

  // Support APIs
  async submitSupportRequest(data: {
    name: string
    email: string
    phone: string
    subject: string
    message: string
  }): Promise<ApiResponse> {
    return { success: false, error: "Support API is not implemented" }
  }

  async getSupportRequests(params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ requests: any[]; total: number; page: number; totalPages: number }>> {
    return { success: true, data: { requests: [], total: 0, page: 1, totalPages: 1 } }
  }

  // System APIs
  async getSystemStats(): Promise<ApiResponse<SystemStats>> {
    const resp = await this.request<any>("/api/admin/summary")
    if (!resp.success || !resp.data) {
      return { success: false, error: resp.error || "Failed to load stats" }
    }
    const data = resp.data as any
    const mapped: SystemStats = {
      totalUsers: Number(data.totalUsers) || 0,
      activeUsers: Number(data.activeSessions) || 0,
      todayRevenue: Number(data.totalRevenue) || 0,
      successRate: 0,
      pendingPayments: Number(data.pendingPayments) || 0,
      blockedUsers: 0,
    }
    return { success: true, data: mapped }
  }

  async getSystemSettings(): Promise<ApiResponse<any>> {
    return { success: true, data: { } }
  }

  async updateSystemSettings(settings: any): Promise<ApiResponse> {
    return { success: true }
  }

  async restartNetworkService(): Promise<ApiResponse> {
    return { success: false, error: "Not implemented" }
  }

  async backupDatabase(): Promise<ApiResponse<{ backupFile: string }>> {
    return { success: false, error: "Not implemented" }
  }

  async getSystemLogs(params?: { level?: string; limit?: number }): Promise<ApiResponse<any[]>> {
    return { success: true, data: [] }
  }

  // Network Management APIs
  async getConnectedDevices(): Promise<ApiResponse<any[]>> {
    return { success: true, data: [] }
  }

  async disconnectAllUsers(): Promise<ApiResponse> {
    return { success: false, error: "Not implemented" }
  }

  async getNetworkStatus(): Promise<ApiResponse<{ status: string; uptime: number; connectedUsers: number }>> {
    return { success: true, data: { status: "ok", uptime: 0, connectedUsers: 0 } }
  }
}

export const apiClient = new ApiClient()

// WebSocket connection for real-time updates
export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000

  connect(transactionId?: string) {
    const wsUrl = `${API_BASE_URL.replace("http", "ws")}/ws${transactionId ? `/payments/${transactionId}` : ""}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log("WebSocket connected")
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      }

      this.ws.onclose = () => {
        console.log("WebSocket disconnected")
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      console.error("Failed to connect WebSocket:", error)
    }
  }

  private handleMessage(data: any) {
    // Emit custom events for different message types
    if (data.type === "payment_status") {
      window.dispatchEvent(
        new CustomEvent("payment_status_update", {
          detail: data.payload,
        }),
      )
    } else if (data.type === "user_connected") {
      window.dispatchEvent(
        new CustomEvent("user_connected", {
          detail: data.payload,
        }),
      )
    } else if (data.type === "user_disconnected") {
      window.dispatchEvent(
        new CustomEvent("user_disconnected", {
          detail: data.payload,
        }),
      )
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect()
      }, this.reconnectInterval)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

export const wsClient = new WebSocketClient()
