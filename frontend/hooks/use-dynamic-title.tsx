"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo } from "react"
import { PROJECT_NAME } from "@/lib/constants"

type TitleOrFactory = string | (() => string)

export function useDynamicTitle(explicitTitle?: TitleOrFactory) {
  const pathname = usePathname()

  // Default route-based titles
  const routeTitle = useMemo(() => {
    if (!pathname) return `Loading... - ${PROJECT_NAME}`
    if (typeof explicitTitle === "string") return `${explicitTitle} - ${PROJECT_NAME}`
    if (typeof explicitTitle === "function") return `${explicitTitle()} - ${PROJECT_NAME}`

    if (pathname === "/") return `Home - ${PROJECT_NAME}`
    if (pathname.startsWith("/about")) return `About Us - ${PROJECT_NAME}`
    if (pathname.startsWith("/admin")) return `Admin - ${PROJECT_NAME}`
    if (pathname.startsWith("/support")) return `Support - ${PROJECT_NAME}`
    if (pathname.startsWith("/packages")) return `Packages - ${PROJECT_NAME}`

    return `${PROJECT_NAME}`
  }, [pathname, explicitTitle])

  // Update document title directly for client-side navigation
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = routeTitle
    }
  }, [routeTitle])

  return { title: routeTitle }
}
