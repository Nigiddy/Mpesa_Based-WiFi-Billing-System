// API configuration optimized for Node.js/Express backend
// When NEXT_PUBLIC_API_URL is not set, fall back to a relative path so
// same-app Next.js API routes work correctly.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

export interface AdminSession {
  id: string
  email: string
  role: string
  lastLogin?: string
}

export interface SupportRequest {
  id: string
  name: string
  email: string
  phone: string
  subject: string
  message: string
  status: 'open' | 'closed' | 'in_progress'
  createdAt: string
}

export interface SystemSettings {
  networkName: string
  adminEmail: string
  currency: string
  taxRate: number
  paymentGateway: string
  maxConcurrentUsers: number
  sessionTimeout: number
  autoDisconnect: boolean
  maintenanceMode: boolean
  mpesaTimeout: number
  defaultPackage: "1hour" | "4hours" | "12hours" | "24hours"
  [key: string]: string | number | boolean | undefined
}

export interface SystemLog {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ConnectedDevice {
  macAddress: string
  ipAddress: string
  connectedAt: string
  dataUsed: number
  userId?: number
}

export interface WebSocketMessage {
  type: 'payment_status' | 'user_connected' | 'user_disconnected' | string
  payload: Record<string, unknown>
}

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

export interface VoucherRedemption {
  id: number
  macAddress: string
  ipAddress?: string
  redeemedAt: string
}

export interface Voucher {
  id: number
  code: string
  planKey: string
  durationMs: number
  maxUses: number
  currentUses: number
  status: "unused" | "active" | "fully_used" | "expired"
  expiresAt?: string
  createdAt: string
  redemptions?: VoucherRedemption[]
}

export interface VoucherRedemptionResult {
  code: string
  planKey: string
  durationMs: number
  expiresAt: string
  redemptionId: number
}

export interface VoucherStatusResult {
  code: string
  planKey: string
  durationMs: number
  status: "unused" | "active" | "fully_used" | "expired"
  expiresAt?: string
  usesRemaining: number
}

class ApiClient {
  private csrfToken: string | null = null

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: { onUnauthorized?: "event" | "silent" } = {},
  ): Promise<ApiResponse<T>> {
    try {
      // Add CSRF token to mutation requests (POST, PUT, DELETE, PATCH)
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      }

      const method = (options.method || "GET").toUpperCase()
      const isMutation = ["POST", "PUT", "DELETE", "PATCH"].includes(method)

      // Include CSRF token for mutations if available
      if (isMutation && this.csrfToken) {
        (headers as Record<string, string>)["X-CSRF-Token"] = this.csrfToken
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        credentials: 'include', // Send cookies with requests
        headers,
        ...options,
      })

      const onUnauthorized = config.onUnauthorized ?? "event"
      const contentType = response.headers.get("content-type") || ""
      const responseText = await response.text()
      const isHtml = contentType.includes("text/html") || responseText.trim().startsWith("<")
      let data: any = null

      if (!isHtml && responseText) {
        try {
          data = JSON.parse(responseText)
        } catch {
          data = null
        }
      }

      // ✅ Handle 401 Unauthorized - auto logout when appropriate
      if (response.status === 401) {
        this.csrfToken = null
        const errorMessage =
          data?.message || data?.error || "Session expired. Please login again."

        if (onUnauthorized === "event" && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { redirectTo: '/admin/login' } }))
        }

        return {
          success: false,
          error: errorMessage,
        }
      }

      if (!response.ok) {
        console.warn("API request failed", {
          url: response.url,
          status: response.status,
          statusText: response.statusText,
          body: responseText.slice(0, 500),
        })

        if (isHtml) {
          throw new Error(`API returned HTML at ${response.url} with status ${response.status}. This usually means the request hit a redirect or login page instead of JSON.`)
        }

        throw new Error(data?.message || data?.error || `API request failed: ${response.status} ${response.statusText}`)
      }

      if (isHtml) {
        throw new Error(`Expected JSON from ${response.url} but received HTML. Check the API endpoint and authentication state.`)
      }

      return data ?? { success: false, error: "Empty response from API" }
    } catch (error) {
      console.warn("API Error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }
    }
  }

  // ✅ CSRF Token Management
  async fetchCsrfToken(): Promise<string | null> {
    try {
      const response = await this.request<{ token: string }>("/api/admin/csrf-token")
      if (response.success && response.data?.token) {
        this.csrfToken = response.data.token
        return this.csrfToken
      }
    } catch (error) {
      console.error("❌ Failed to fetch CSRF token:", error)
    }
    return null
  }

  getCsrfToken(): string | null {
    return this.csrfToken
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token
  }

  // Auth APIs
  async login(email: string, password: string): Promise<ApiResponse<{ admin: AdminSession }>> {
    return this.request(
      "/auth/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
      { onUnauthorized: "silent" },
    )
  }

  async logout(): Promise<ApiResponse> {
    return this.request("/auth/admin/logout", {
      method: "POST",
    })
  }

  async checkAuthStatus(): Promise<ApiResponse<{ admin: AdminSession }>> {
    return this.request("/auth/admin/me", {}, { onUnauthorized: "silent" })
  }

  async checkSessionStatus(macAddress: string): Promise<ApiResponse<{ hasActiveSession: boolean; expiresAt?: string }>> {
    return this.request(`/api/session/status?mac=${macAddress}`);
  }

  // Payment APIs
  async initiatePayment(paymentData: PaymentRequest): Promise<ApiResponse<PaymentResponse>> {
    return this.request("/api/v1/payments/initiate", {
      method: "POST",
      body: JSON.stringify(paymentData),
    })
  }

  async checkPaymentStatus(transactionId: string): Promise<ApiResponse<PaymentResponse>> {
    return this.request(`/api/v1/payments/status/${transactionId}`)
  }

  async getPaymentHistory(phone: string): Promise<ApiResponse<Transaction[]>> {
    // Optional: can be implemented later via /api/transactions?search=phone
    const resp = await this.getTransactions({ search: phone, limit: 100 })
    if (!resp.success || !resp.data) return { success: false, error: resp.error }
    return { success: true, data: resp.data.transactions }
  }

  // User Management APIs
  async getUsers(params?: {
    search?: string
    status?: string
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ users: User[]; total: number; page: number; totalPages: number }>> {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append("search", params.search)
    if (params?.status && params.status !== "all") queryParams.append("status", params.status)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())
    return this.request(`/api/users?${queryParams.toString()}`)
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
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append("search", params.search)
    if (params?.status && params.status !== "all") queryParams.append("status", params.status)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())
    if (params?.startDate) queryParams.append("startDate", params.startDate)
    if (params?.endDate) queryParams.append("endDate", params.endDate)
    return this.request(`/api/transactions?${queryParams.toString()}`)
  }

  async refundTransaction(transactionId: string, reason?: string): Promise<ApiResponse> {
    return this.request(`/api/transactions/${transactionId}/refund`, { method: "POST", body: JSON.stringify({ reason }) })
  }

  async downloadReceipt(transactionId: string): Promise<ApiResponse<{ receiptUrl: string }>> {
    const receiptUrl = `${API_BASE_URL}/api/transactions/${encodeURIComponent(transactionId)}/receipt/download`
    if (typeof window !== "undefined") {
      window.open(receiptUrl, "_blank")
    }
    return Promise.resolve({ success: true, data: { receiptUrl } })
  }

  exportUsersCSV(): void {
    const url = `${API_BASE_URL}/api/users/export/csv`
    if (typeof window !== "undefined") {
      window.location.assign(url)
    }
  }

  exportTransactionsCSV(): void {
    const url = `${API_BASE_URL}/api/transactions/export/csv`
    if (typeof window !== "undefined") {
      window.location.assign(url)
    }
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
  }): Promise<ApiResponse<{ requests: SupportRequest[]; total: number; page: number; totalPages: number }>> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append("status", params.status)
    if (params?.page) queryParams.append("page", params.page.toString())
    if (params?.limit) queryParams.append("limit", params.limit.toString())
    return this.request(`/api/support/requests?${queryParams.toString()}`)
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
      successRate: Number(data.successRate) || 0,  // ✅ FIXED: Now uses real calculation
      pendingPayments: Number(data.pendingPayments) || 0,
      blockedUsers: Number(data.blockedUsers) || 0,  // ✅ FIXED: Now uses real count
    }
    return { success: true, data: mapped }
  }

  // ✅ FIXED: Get system settings from backend
  async getSystemSettings(): Promise<ApiResponse<SystemSettings>> {
    return this.request<SystemSettings>("/api/system/settings")
  }

  // ✅ FIXED: Update system settings with backend persistence
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<ApiResponse> {
    return this.request("/api/system/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    })
  }

  // ✅ NEW: Health check endpoints
  async getHealthStatus() {
    try {
      const [apiHealth, dbHealth, mpesaHealth, sslHealth] = await Promise.all([
        this.request("/api/health/api").catch(() => null),
        this.request("/api/health/database").catch(() => null),
        this.request("/api/health/mpesa").catch(() => null),
        this.request("/api/health/ssl").catch(() => null),
      ])

      return {
        success: true,
        data: {
          api: apiHealth?.data || { status: "unknown" },
          database: dbHealth?.data || { status: "unknown" },
          mpesa: mpesaHealth?.data || { status: "unknown" },
          ssl: sslHealth?.data || { status: "unknown" },
        },
      }
    } catch (error) {
      return { success: false, error: "Failed to check health" }
    }
  }

  async restartNetworkService(): Promise<ApiResponse> {
    return { success: false, error: "Not implemented" }
  }

  async backupDatabase(): Promise<ApiResponse<{ backupFile: string }>> {
    return { success: false, error: "Not implemented" }
  }

  async getSystemLogs(params?: { level?: string; limit?: number }): Promise<ApiResponse<SystemLog[]>> {
    const queryParams = new URLSearchParams()
    if (params?.level) queryParams.append("level", params.level)
    if (params?.limit) queryParams.append("limit", params.limit.toString())
    return this.request(`/api/system/logs?${queryParams.toString()}`)
  }

  // Network Management APIs
  async getConnectedDevices(): Promise<ApiResponse<ConnectedDevice[]>> {
    return this.request("/api/network/devices")
  }

  async disconnectAllUsers(): Promise<ApiResponse> {
    return this.request("/api/network/disconnect-all", { method: "POST" })
  }

  async getNetworkStatus(): Promise<ApiResponse<{ status: string; uptime: number; connectedUsers: number }>> {
    return this.request("/api/network/status")
  }

  // ─── Voucher APIs ──────────────────────────────────────────────────────────

  async generateVouchers(params: {
    planKey: string
    quantity: number
    maxUses?: number
    expiresInDays?: number
  }): Promise<ApiResponse<Voucher[]>> {
    return this.request("/api/vouchers/generate", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  async getVouchers(params?: {
    status?: "unused" | "active" | "fully_used" | "expired"
    page?: number
    limit?: number
  }): Promise<ApiResponse<{ vouchers: Voucher[]; total: number; page: number; totalPages: number }>> {
    const q = new URLSearchParams()
    if (params?.status) q.append("status", params.status)
    if (params?.page) q.append("page", params.page.toString())
    if (params?.limit) q.append("limit", params.limit.toString())
    return this.request(`/api/vouchers?${q.toString()}`)
  }

  /** Triggers a CSV file download in the browser */
  exportVouchersCSV(): void {
    const url = `${API_BASE_URL}/api/vouchers/export/csv`
    if (typeof window !== "undefined") {
      window.location.assign(url)
    }
  }

  async redeemVoucher(code: string, macAddress: string): Promise<ApiResponse<VoucherRedemptionResult>> {
    return this.request("/api/vouchers/redeem", {
      method: "POST",
      body: JSON.stringify({ code, macAddress }),
    })
  }

  async checkVoucherStatus(code: string): Promise<ApiResponse<VoucherStatusResult>> {
    return this.request(`/api/vouchers/${encodeURIComponent(code)}/status`)
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
    const baseUrl = API_BASE_URL ?? ''
    const wsUrl = `${baseUrl.replace("http", "ws")}/ws${transactionId ? `/payments/${transactionId}` : ""}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
      }

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      }

      this.ws.onclose = () => {
        this.reconnect()
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error)
      }
    } catch (error) {
      console.error("Failed to connect WebSocket:", error)
    }
  }

  private handleMessage(data: WebSocketMessage) {
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

  send(data: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

export const wsClient = new WebSocketClient()
