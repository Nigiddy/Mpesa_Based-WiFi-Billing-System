"use client"

import { motion } from "framer-motion"
import { Wifi, Zap, Shield } from "lucide-react"

export const HeroSection = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 py-20 lg:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Pay with M-Pesa • Instant Activation</span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6 text-foreground">
            Find Your Perfect
            <span className="block bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
              WiFi Plan
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            From casual browsing to intensive streaming, we have a WiFi package
            that fits your lifestyle and budget. Pay securely with M-Pesa and get connected instantly.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-6 lg:gap-8 mt-12"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium">High-Speed Connection</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium">Instant Activation</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium">Secure M-Pesa Payment</span>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-center mt-16"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default HeroSection