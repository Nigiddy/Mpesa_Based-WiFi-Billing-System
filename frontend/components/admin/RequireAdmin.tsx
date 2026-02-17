import { useAuth } from "@/hooks/use-auth"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

/**
 * Wrap a page/component to require admin authentication.
 * Redirects to /admin/login if not authenticated.
 * Bypasses protection for /admin/login route.
 * Usage: <RequireAdmin><YourComponent /></RequireAdmin>
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Allow login page to render without authentication
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, loading, router, isLoginPage])

  if (loading) {
    // Show loading spinner or nothing while checking auth
    return isLoginPage ? <>{children}</> : null
  }
  
  if (!isAuthenticated && !isLoginPage) {
    return null
  }

  return <>{children}</>
}
