import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Authentication is enforced client-side by useAuth (hooks/use-auth.tsx), which
// calls /auth/admin/me on the Express backend (localhost:5000).
//
// JWT_SECRET is backend-only and must never be exposed to the frontend.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass all requests through. The /admin dashboard page guards itself via
  // useAuth: if the backend returns 401, the hook redirects to /admin/login.
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
