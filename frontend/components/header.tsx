"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "./ui/logo"
import { cn } from "@/lib/utils"
import { PROJECT_NAME } from "@/lib/constants"

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
]

/**
 * Customer-facing header. Admin login has moved to the footer, so the first
 * thing a customer sees is how to get online, not a staff button.
 */
export function Header() {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close the mobile menu after navigating
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Lock page scroll while the menu is open; close it with Escape
  useEffect(() => {
    if (!isMenuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [isMenuOpen])

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-5 px-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md text-[17px] font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <Logo />
          <span>{PROJECT_NAME}</span>
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-[10px] text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence initial={false}>
        {isMenuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={reduceMotion ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden"
          >
            <ul className="flex flex-col">
              {navLinks.map((link) => {
                const active = isActive(link.href)
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex h-12 items-center rounded-lg px-3 text-[15px] font-medium transition-colors hover:bg-muted",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
