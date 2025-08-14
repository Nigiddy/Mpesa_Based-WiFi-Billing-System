import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { generateMetadata } from '@/lib/metadata'

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
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
