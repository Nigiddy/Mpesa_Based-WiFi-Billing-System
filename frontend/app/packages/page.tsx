"use client"

import { packages } from "@/lib/packages"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "@/components/packages/HeroSection"
import { FaqSection } from "@/components/packages/FaqSection"
import { CtaSection } from "@/components/packages/CtaSection"
import { PackageOfferCard } from "@/components/packages/PackageOfferCard"
import useDynamicTitle from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Sparkles, Shield, Zap } from "lucide-react"

export default function PackagesPage() {
  useDynamicTitle("WiFi Packages")

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <HeroSection />

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-6 lg:gap-10 mb-16 pb-8 border-b border-border/50"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium">Secure M-Pesa Payments</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">Instant Activation</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium">No Hidden Fees</span>
          </div>
        </motion.div>

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Choose Your Plan</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Flexible Plans for Every Need
          </h2>
          <p className="text-muted-foreground">
            Select the perfect package and pay with M-Pesa in seconds
          </p>
        </motion.div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-20">
          {packages.map((pkg, index) => (
            <PackageOfferCard key={pkg.id} pkg={pkg} index={index} />
          ))}
        </div>

        {/* Divider */}
        <div className="relative my-20">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        <FaqSection />

        {/* Divider */}
        <div className="relative my-20">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
        </div>

        <CtaSection />
      </main>

      <Footer />
    </div>
  )
}