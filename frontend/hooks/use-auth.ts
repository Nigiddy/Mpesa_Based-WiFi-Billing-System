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
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    admin: null,
    token: null,
    loading: true,
  })

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('admin_token')
    const adminData = localStorage.getItem('admin_data')
    
    if (token && adminData) {
      try {
        const admin = JSON.parse(adminData)
        setAuthState({
          isAuthenticated: true,
          admin,
          token,
          loading: false,
        })
      } catch (error) {
        console.error('Error parsing admin data:', error)
        logout()
      }
    } else {
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Login failed',
        }
      }

      const { token, admin } = data
      // Store token and admin data
      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_data', JSON.stringify(admin))

      setAuthState({
        isAuthenticated: true,
        admin,
        token,
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
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_data')
    setAuthState({
      isAuthenticated: false,
      admin: null,
      token: null,
      loading: false,
    })
  }

  const getAuthHeaders = () => {
    const token = localStorage.getItem('admin_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return {
    ...authState,
    login,
    logout,
    getAuthHeaders,
  }
} 