"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { packages } from "@/lib/packages"
import { HeroSection } from "@/components/packages/HeroSection"
import { FaqSection } from "@/components/packages/FaqSection"
import { CtaSection } from "@/components/packages/CtaSection"
import { PackageCard } from "@/components/packages/PackageCard"
import useDynamicTitle from "@/hooks/use-dynamic-title"

export default function PackagesPage() {
  useDynamicTitle("WiFi Packages")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <HeroSection />

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>

        <FaqSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  )
}