import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next()
  }

  const adminToken = request.cookies.get("admin_token")?.value
  if (adminToken) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/admin/login", request.url)
  loginUrl.searchParams.set("redirect", pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/admin/:path*"],
}
