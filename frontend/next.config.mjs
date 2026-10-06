/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  env: {
    // ⚠️  Only expose variables that are genuinely needed in the browser.
    // NEXT_PUBLIC_* vars are public by design — any other secret added here
    // will be baked into the client JS bundle and visible to anyone.
    // JWT_SECRET must NEVER appear here — middleware.ts reads it server-side only.
    //
    // NEXT_PUBLIC_API_URL is intentionally set to an empty string in both .env
    // (development) and .env.production so that all API and WebSocket URLs are
    // relative (e.g. /api/…, /ws). In development the Next.js dev-server rewrites
    // below proxy those relative paths to the Express backend. In production, Caddy
    // routes them. This keeps the admin_token cookie same-origin in every environment.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_PORTAL_ORIGIN: process.env.NEXT_PUBLIC_PORTAL_ORIGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  /**
   * Dev-server reverse-proxy rewrites.
   *
   * Problem solved: the browser WebSocket API has no `credentials` option,
   * so cross-origin WS connections (localhost:3000 → localhost:5000) never
   * carry the HttpOnly admin_token cookie. Making all traffic same-origin via
   * these rewrites fixes the WS auth without changing any cookie attributes,
   * JWT handling, or authentication logic.
   *
   * In production this block is inert — Caddy handles routing at the edge.
   */
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    return [
      // REST API routes
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      // Auth routes (login, logout, refresh, /auth/admin/me)
      {
        source: '/auth/:path*',
        destination: `${backendUrl}/auth/:path*`,
      },
      // M-Pesa callback — backend receives Safaricom POST at /mpesa/callback
      {
        source: '/mpesa/:path*',
        destination: `${backendUrl}/mpesa/:path*`,
      },
      // Admin WebSocket (/ws) and payment WebSocket (/ws/payments/:id)
      {
        source: '/ws',
        destination: `${backendUrl}/ws`,
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*`,
      },
    ]
  },
}

export default nextConfig