"use client"

import { useState } from "react"
import { packages } from "@/lib/packages"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Sparkles, Shield, Zap, ArrowRight, Check } from "lucide-react"
import { PremiumPackageGrid, PackageComparisonTable } from "@/components/PremiumPackageCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function PackagesPage() {
  useDynamicTitle("WiFi Packages")
  const [selectedPackages, setSelectedPackages] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* PREMIUM HERO SECTION */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1, delayChildren: 0.2 },
            },
          }}
          className="relative py-16 lg:py-24 text-center"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/15 rounded-full blur-3xl"
            />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1 },
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Plans for Every Budget
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              <span>Choose Your </span>
              <span className="gradient-text">Perfect Plan</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
            >
              From casual browsing to streaming and downloading, we have a package
              that fits your needs. All with instant M-Pesa activation.
            </motion.p>

            {/* Trust Indicators */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="flex flex-wrap justify-center gap-4 lg:gap-6"
            >
              {[
                { icon: Shield, text: "256-bit SSL Encrypted" },
                { icon: Zap, text: "Instant Activation" },
                { icon: Sparkles, text: "No Hidden Fees" },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/30"
                  >
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {item.text}
                    </span>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </motion.section>

        {/* PACKAGES GRID */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-12 lg:py-20"
        >
          <PremiumPackageGrid
            packages={packages}
            selectedId={selectedPackages[0]}
            onSelect={(id) => setSelectedPackages([id])}
          />
        </motion.section>

        {/* COMPARISON TABLE */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-12 lg:py-20"
        >
          <div className="mb-12 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Compare Features
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how each package compares side-by-side to find the perfect fit
            </p>
          </div>
          <PackageComparisonTable packages={packages} />
        </motion.section>

        {/* FAQ SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-12 lg:py-20"
        >
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4">
              {[
                {
                  q: "How quickly can I connect?",
                  a: "Once you complete payment via M-Pesa, your connection is activated instantly - usually within 30 seconds.",
                },
                {
                  q: "Can I change my package later?",
                  a: "Yes! You can upgrade or downgrade your package at any time. Changes take effect on your next purchase.",
                },
                {
                  q: "What if I don't use all my data?",
                  a: "Unused data expires at the end of your plan duration. We recommend choosing a plan that matches your typical usage.",
                },
                {
                  q: "Is there contract required?",
                  a: "No contracts! Each purchase is independent. You Only pay for what you use, when you use it.",
                },
                {
                  q: "Can I get a refund?",
                  a: "Refunds are available within 24 hours of purchase if you haven't used your data. Contact our support team.",
                },
                {
                  q: "What payment methods do you accept?",
                  a: "We currently accept M-Pesa payments. More payment methods are coming soon!",
                },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card variant="glass">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                      <p className="text-muted-foreground text-sm">{faq.a}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* BENEFITS SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: "-100px" }}
          className="py-12 lg:py-20"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
            Why Customers Love KIBARUANI
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "⚡",
                title: "Ultra-Fast Setup",
                description:
                  "Get connected in under 30 seconds with our instant activation system",
              },
              {
                icon: "🔒",
                title: "Bank-Grade Security",
                description:
                  "Your payment information is protected with 256-bit SSL encryption",
              },
              {
                icon: "🏆",
                title: "Reliable Network",
                description:
                  "99.9% uptime guarantee with 24/7 technical support",
              },
              {
                icon: "💳",
                title: "Flexible Payment",
                description:
                  "Pay exactly what you use with our transparent pricing model",
              },
              {
                icon: "📱",
                title: "Mobile Optimized",
                description:
                  "Works seamlessly on all devices with our responsive design",
              },
              {
                icon: "🌍",
                title: "Consistent Coverage",
                description:
                  "Enjoy reliable connection across multiple locations",
              },
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
              >
                <Card variant="interactive">
                  <CardContent className="pt-8 text-center">
                    <div className="text-4xl mb-4">{benefit.icon}</div>
                    <h3 className="text-lg font-semibold mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA SECTION */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="py-12 lg:py-16 mb-12"
        >
          <Card variant="elevated" className="bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="p-12 md:p-16 text-center">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to Get Connected?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Choose your plan above, or start with our most popular option
              </p>
              <Link href="/">
                <Button variant="premium" size="lg">
                  Select a Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  )
}