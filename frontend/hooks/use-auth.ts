import { useState, useEffect } from 'react'

interface Admin {
  id: number
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  admin: Admin | null
  token: string | null
  loading: boolean
}

export function useAuth() {
    // SECURITY NOTE: Storing JWT in localStorage is vulnerable to XSS.
    // For production, use HttpOnly cookies for admin tokens and update backend to support cookie-based auth.
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    admin: null,
    token: null,
    loading: true,
  })

  useEffect(() => {
    // On mount, check authentication by calling backend
    (async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/admin/me`, {
          credentials: 'include',
        })
        const data = await response.json()
        if (response.ok && data.success && data.admin) {
          setAuthState({
            isAuthenticated: true,
            admin: data.admin,
            token: null,
            loading: false,
          })
        } else {
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    })()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
        }
      }
      const { admin } = data
      setAuthState({
        isAuthenticated: true,
        admin,
        token: null,
        loading: false,
      })
      return { success: true, admin }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  const logout = () => {
    // Call backend to clear cookie (implement /auth/admin/logout route)
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/admin/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setAuthState({
      isAuthenticated: false,
      admin: null,
      token: null,
      loading: false,
    })
  }

  const getAuthHeaders = () => {
    // No longer needed; rely on cookies
    return {}
  }

  return {
    ...authState,
    login,
    logout,
    getAuthHeaders,
  }
} 