"use client"

import { Toaster } from "sonner"
import { useTheme } from "@/hooks/use-theme"

export function ToastProvider() {
  const { theme } = useTheme()

  return (
    <Toaster
      theme={theme}
      position="top-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "hsl(var(--card))",
          border: "1px solid var(--border-hairline)",
          color: "hsl(var(--foreground))",
        },
      }}
    />
  )
}
