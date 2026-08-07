import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

// JWT_SECRET must be the same value used by the Express backend.
// In Next.js edge middleware, env vars are accessed directly (no process.env polyfill needed).
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin/* routes; the login page itself is always accessible
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  const adminToken = request.cookies.get("admin_token")?.value

  if (adminToken) {
    try {
      // ✅ C-1 FIX: Verify JWT signature + expiry + role at the edge layer.
      // jwtVerify throws on: missing/bad signature, expired token, malformed payload.
      const { payload } = await jwtVerify(adminToken, JWT_SECRET)

      // Enforce role claim — an admin_token must carry role:"admin"
      if (payload.role !== "admin") {
        throw new Error("Insufficient role")
      }

      return NextResponse.next()
    } catch {
      // Token is invalid, expired, or tampered — treat as unauthenticated
      const loginUrl = new URL("/admin/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      const response = NextResponse.redirect(loginUrl)
      // Clear the stale/invalid cookie so the browser doesn't keep sending it
      response.cookies.delete("admin_token")
      return response
    }
  }

  // No cookie at all — redirect to login
  const loginUrl = new URL("/admin/login", request.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/admin/:path*"],
}

