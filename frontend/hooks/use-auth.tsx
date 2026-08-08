"use client"

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react'
import { apiClient, wsClient, AdminSession } from '@/lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  admin: AdminSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  // H-3 FIX: typed as Promise<void> to match the async implementation
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<{ isAuthenticated: boolean; admin: AdminSession | null; loading: boolean }>({
    isAuthenticated: false,
    admin: null,
    loading: true,
  })

  const checkAuthInFlight = useRef(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (checkAuthInFlight.current) return;
      checkAuthInFlight.current = true;
      
      try {
        const response = await apiClient.checkAuthStatus()
        if (response.success && response.data?.admin) {
          setAuthState({ isAuthenticated: true, admin: response.data.admin, loading: false })
          
          // ✅ Fetch CSRF token for admin mutations
          await apiClient.fetchCsrfToken()
        } else {
          setAuthState({ isAuthenticated: false, admin: null, loading: false })
        }
      } catch (error) {
        setAuthState({ isAuthenticated: false, admin: null, loading: false })
      } finally {
        checkAuthInFlight.current = false;
      }
    }
    checkAuth()
  }, [])

  // ✅ Listen for 401 unauthorized events and auto-logout
  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      setAuthState({ isAuthenticated: false, admin: null, loading: false })
      apiClient.setCsrfToken(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized)
      return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password)
      if (response.success && response.data?.admin) {
        setAuthState({ isAuthenticated: true, admin: response.data.admin, loading: false })
        
        // ✅ Fetch CSRF token after login
        await apiClient.fetchCsrfToken()
        
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Login failed" }
    }
  }

  // H-3 FIX: logout is now a proper async function that:
  // 1. Always clears local state (even if the server call fails)
  // 2. Logs server-side failures rather than silently ignoring them
  // 3. Performs a hard redirect to flush all cached page/component state
  const logout = async (): Promise<void> => {
    // Close the WebSocket FIRST — before clearing auth state or hitting the server.
    // This ensures the socket is torn down cleanly while credentials are still valid.
    wsClient.disconnect()

    // Clear CSRF token immediately so no mutations can fire during logout
    apiClient.setCsrfToken(null)

    try {
      await apiClient.logout()
    } catch (error) {
      // Server-side logout failed (network error, server down, etc.).
      // The HttpOnly cookie will expire naturally, but we still clear local
      // state so the user is treated as logged out in this session.
      console.error('[Auth] Server-side logout failed — clearing local session anyway:', error)
    }

    setAuthState({ isAuthenticated: false, admin: null, loading: false })

    // Hard navigation ensures all cached admin data is flushed from memory.
    // Use replace() so the dashboard page is not in the back-stack.
    if (typeof window !== 'undefined') {
      window.location.replace('/admin/login')
    }
  }

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
