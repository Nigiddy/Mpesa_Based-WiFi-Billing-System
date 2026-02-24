"use client"


import { ReactNode } from "react"

interface AdminHeaderProps {
  children?: ReactNode
}

const AdminHeader = ({ children }: AdminHeaderProps) => (
  <header className="sticky top-0 z-50 w-full border-b border-slate-200/20 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          
        </div>
        <div className="flex items-center space-x-4">
          {children}
        </div>
      </div>
    </div>
  </header>
)

export default AdminHeader;
