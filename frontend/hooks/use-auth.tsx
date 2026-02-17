"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { apiClient } from '@/lib/api'

interface Admin {
  id: number
  email: string
}

interface AuthContextType {
  isAuthenticated: boolean
  admin: Admin | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    admin: null,
    loading: true,
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiClient.checkAuthStatus()
        if (response.success && response.admin) {
          setAuthState({ isAuthenticated: true, admin: response.admin, loading: false })
          
          // ✅ Fetch CSRF token for admin mutations
          console.log("📛 Fetching CSRF token for admin dashboard...")
          await apiClient.fetchCsrfToken()
        } else {
          setAuthState({ isAuthenticated: false, admin: null, loading: false })
        }
      } catch (error) {
        setAuthState({ isAuthenticated: false, admin: null, loading: false })
      }
    }
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password)
      if (response.success && response.admin) {
        setAuthState({ isAuthenticated: true, admin: response.admin, loading: false })
        
        // ✅ Fetch CSRF token after login
        console.log("📛 Fetching CSRF token after login...")
        await apiClient.fetchCsrfToken()
        
        return { success: true }
      }
      return { success: false, error: response.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Login failed" }
    }
  }

  const logout = async () => {
    // ✅ Clear CSRF token on logout for security
    apiClient.setCsrfToken(null)
    await apiClient.logout()
    setAuthState({ isAuthenticated: false, admin: null, loading: false })
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
