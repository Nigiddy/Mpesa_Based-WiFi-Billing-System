"use client"

import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Shield, Zap, Heart, Users, Wifi, TrendingUp, MapPin } from "lucide-react"

const stats = [
  { icon: Users, number: "10K+", label: "Active Users" },
  { icon: Wifi, number: "50+", label: "Hotspots" },
  { icon: TrendingUp, number: "99.9%", label: "Uptime" },
  { icon: MapPin, number: "5", label: "Cities Covered" },
]

const values = [
  { icon: Shield, title: "Secure & Private" },
  { icon: Zap, title: "High-Speed Access" },
  { icon: Heart, title: "Community First" },
]

export default function AboutPage() {
  useDynamicTitle("About Us - Qonnect")

  return (
    <div className="min-h-screen bg-background py-20">
      {/* Constrained max-width for easier reading */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-24"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Connecting Communities.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We believe internet access is a utility, not a luxury. Qonnect provides seamless, reliable WiFi powered by convenient M-Pesa payments.
          </p>
        </motion.div>

        {/* Stats Section - Minimalist Row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-24 border-y border-border/50 py-12"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="text-center flex flex-col items-center">
                <Icon className="w-5 h-5 text-primary mb-3 opacity-80" />
                <div className="text-3xl font-bold text-foreground mb-1">{stat.number}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            )
          })}
        </motion.div>

        {/* Mission & Values - Side by Side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid md:grid-cols-2 gap-16 items-start"
        >
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Frustrated by the digital divide, we set out to build a network that is both highly affordable and exceptionally reliable. From our first hotspot in Nairobi to thousands of active users today, our goal remains simple: keep you connected without the hassle.
            </p>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">What Drives Us</h2>
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{value.title}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

      </main>
    </div>
  )
}