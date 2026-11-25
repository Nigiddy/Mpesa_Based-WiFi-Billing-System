import type { Metadata } from 'next'
import { adminMetadata } from '@/lib/metadata'
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient'

export const metadata: Metadata = adminMetadata

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
