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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_PORTAL_ORIGIN: process.env.NEXT_PUBLIC_PORTAL_ORIGIN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
}

export default nextConfig