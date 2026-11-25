import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from "@vercel/analytics/next"
import '@/styles/globals.css'
import { generateMetadata } from '@/lib/metadata'
import { getOrganizationSchema, getWebSiteSchema } from '@/lib/schema'
import { ThemeProvider } from '@/components/theme-provider'
import { ToastProvider } from '@/components/toast-provider'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = generateMetadata()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const orgSchema = getOrganizationSchema()
  const websiteSchema = getWebSiteSchema()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html {
                font-family: ${GeistSans.style.fontFamily};
                --font-sans: ${GeistSans.variable};
                --font-mono: ${GeistMono.variable};
              }
            `,
          }}
        />
      </head>
      <body className="flex flex-col min-h-screen bg-background font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <ThemeProvider>
          <ToastProvider />
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
