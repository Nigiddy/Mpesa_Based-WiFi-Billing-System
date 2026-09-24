import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"


// Real authentication is enforced by the Express backend on every API call:

//
// JWT_SECRET is backend-only and must never be exposed to the frontend.


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin/* routes; the login page itself is always accessible
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }


  const hasSessionCookie = request.cookies.has("admin_token")

  if (hasSessionCookie) {
    return NextResponse.next()
  }

  // No cookie — redirect to login, preserving the intended destination
  const loginUrl = new URL("/admin/login", request.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/admin/:path*"],
}
