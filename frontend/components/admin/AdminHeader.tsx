"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Activity,
  Bell,
  CreditCard,
  LogOut,
  Settings,
  Ticket,
  Users,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { AdminNotification } from "@/lib/overview"

export type AdminTabValue = "overview" | "payments" | "vouchers" | "users" | "settings"

interface AdminHeaderProps {
  activeTab?: AdminTabValue
  onTabChange?: (tab: AdminTabValue) => void
  notifications?: AdminNotification[]
}

const ADMIN_TABS: Array<{
  value: AdminTabValue
  label: string
  icon: typeof Activity
}> = [
  { value: "overview", label: "Overview", icon: Activity },
  { value: "payments", label: "Payments", icon: CreditCard },
  { value: "vouchers", label: "Vouchers", icon: Ticket },
  { value: "users", label: "Users", icon: Users },
  { value: "settings", label: "Settings", icon: Settings },
]

function getInitials(email?: string | null): string {
  if (!email) return "AD"
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "") || ""
  if (local.length >= 2) return local.slice(0, 2).toUpperCase()
  if (local.length === 1) return (local + "A").toUpperCase()
  return "AD"
}

export default function AdminHeader({
  activeTab = "overview",
  onTabChange,
  notifications = [],
}: AdminHeaderProps) {
  const { admin, logout } = useAuth()
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length
  const initials = getInitials(admin?.email)

  const handleBellOpenChange = (open: boolean) => {
    if (open && notifications.length > 0) {
      setReadIds(new Set(notifications.map((n) => n.id)))
    }
  }

  const renderTabs = (idPrefix: string) =>
    ADMIN_TABS.map((tab) => {
      const Icon = tab.icon
      const isActive = activeTab === tab.value
      return (
        <button
          key={`${idPrefix}-${tab.value}`}
          type="button"
          aria-current={isActive ? "page" : undefined}
          onClick={() => onTabChange?.(tab.value)}
          className={cn(
            "relative inline-flex h-full shrink-0 items-center gap-[7px] px-3 text-[14px] font-medium whitespace-nowrap motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            isActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{tab.label}</span>
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-3 -bottom-[1px] h-[2px] rounded-sm bg-foreground motion-safe:transition-opacity motion-safe:duration-150",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
        </button>
      )
    })

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-surface">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4 sm:h-[60px] sm:gap-7 sm:px-7">
        {/* Brand */}
        <Link
          href="/admin"
          onClick={(e) => {
            if (onTabChange) {
              e.preventDefault()
              onTabChange("overview")
            }
          }}
          className="inline-flex shrink-0 items-center gap-[9px] whitespace-nowrap rounded-md text-[17px] font-semibold tracking-[-0.02em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <svg
            className="h-7 w-7 text-foreground"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="16" cy="16" r="14" />
            <path d="M9.6 14.6a9 9 0 0 1 12.8 0" />
            <path d="M12.3 17.7a5.2 5.2 0 0 1 7.4 0" />
            <circle cx="16" cy="21.4" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          <span>Qonnect</span>
        </Link>

        {/* Desktop Tabs */}
        <nav
          className="hidden h-full items-center gap-1 sm:flex"
          aria-label="Admin sections"
        >
          {renderTabs("desktop")}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />

          {/* Notifications Bell */}
          <DropdownMenu onOpenChange={handleBellOpenChange}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className="relative grid h-10 w-10 place-items-center rounded-[10px] text-muted-foreground transition-colors duration-150 hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <Bell className="h-[19px] w-[19px]" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-[10px] top-[9px] h-2 w-2 rounded-full bg-primary ring-2 ring-surface"
                  />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 bg-surface border-hairline">
              <DropdownMenuLabel className="text-[13px] font-semibold">
                Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-4 text-center text-[13px] text-muted-foreground">
                  No recent notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((item) => (
                  <DropdownMenuItem
                    key={item.id}
                    className="flex flex-col items-start gap-0.5 py-2.5 cursor-default focus:bg-surface-2"
                  >
                    <span className="text-[13px] font-medium text-foreground leading-snug">
                      {item.title}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Avatar pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Admin account menu"
                className="ml-0.5 inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-transparent px-[5px] sm:ml-1.5 sm:pl-[5px] sm:pr-3 text-[13.5px] font-medium text-foreground transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-muted-foreground">
                  {initials}
                </span>
                <span className="hidden sm:inline">Admin</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-surface border-hairline">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    Admin Account
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {admin?.email || "Administrator"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-danger focus:bg-danger-soft focus:text-danger"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Tabs Row */}
      <nav
        className="flex h-11 items-center overflow-x-auto border-t border-hairline px-1.5 no-scrollbar sm:hidden"
        aria-label="Admin sections"
      >
        {renderTabs("mobile")}
      </nav>
    </header>
  )
}
