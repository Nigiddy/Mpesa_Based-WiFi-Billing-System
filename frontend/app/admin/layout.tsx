"use client"

import { AuthProvider } from "@/hooks/use-auth"
import { RequireAdmin } from "@/components/admin/RequireAdmin"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <RequireAdmin>{children}</RequireAdmin>
    </AuthProvider>
  )
}