import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { generateMetadata } from '@/lib/metadata'
import { ThemeProvider } from '@/components/theme-provider'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ToastProvider } from '@/components/toast-provider'

export const metadata: Metadata = generateMetadata({
  title: 'Qonnect WiFi - Fast, Reliable Internet Access',
  description: 'WiFi Billing System - Fast, reliable, and affordable internet access powered by M-Pesa payments in Kenya.',
  keywords: ['WiFi', 'internet', 'billing', 'M-Pesa', 'Kenya', 'Qonnect', 'WiFi packages'],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="flex flex-col min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <ToastProvider />
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
