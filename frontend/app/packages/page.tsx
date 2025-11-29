"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { ToastProvider } from "@/components/toast-provider"
import { packages } from "@/lib/packages"
import { HeroSection } from "@/components/packages/HeroSection"
import { FaqSection } from "@/components/packages/FaqSection"
import { CtaSection } from "@/components/packages/CtaSection"
import { PackageCard } from "@/components/packages/PackageCard"
import useDynamicTitle from "@/hooks/use-dynamic-title"

export default function PackagesPage() {
  useDynamicTitle("WiFi Packages")

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <HeroSection />

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} />
            ))}
          </div>

          <FaqSection />
          <CtaSection />
        </main>

        <Footer />
      </div>
    </>
  )
}