"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo } from "react"
import { PROJECT_NAME } from "@/lib/constants"

type TitleOrFactory = string | (() => string)

export function useDynamicTitle(explicitTitle?: TitleOrFactory) {
  const pathname = usePathname()

  // Default route-based titles aligned with SEO metadata structure
  const routeTitle = useMemo(() => {
    if (!pathname) return `${PROJECT_NAME} | Fast & Affordable Internet`
    
    let titleStr = typeof explicitTitle === "function" ? explicitTitle() : explicitTitle

    if (titleStr) {
      if (titleStr.includes(PROJECT_NAME) || titleStr.includes("Qonnect") || titleStr.includes("KIBARUANI")) {
        return titleStr
      }
      return `${titleStr} | ${PROJECT_NAME}`
    }

    if (pathname === "/") return `${PROJECT_NAME} | Instant High-Speed WiFi Packages in Kenya`
    if (pathname.startsWith("/about")) return `About Us | ${PROJECT_NAME}`
    if (pathname.startsWith("/admin")) return `Admin Portal | ${PROJECT_NAME}`
    if (pathname.startsWith("/support")) return `Support & FAQs | ${PROJECT_NAME}`

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
