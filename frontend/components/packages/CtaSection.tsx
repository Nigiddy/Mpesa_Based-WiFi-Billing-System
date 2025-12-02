"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Zap, ArrowRight, Smartphone } from "lucide-react"

export const CtaSection = () => {
  return (
    <div className="relative overflow-hidden my-20 lg:my-32">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-blue-500/10 to-primary/10 rounded-3xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-transparent rounded-3xl" />
      
      {/* Animated background elements */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-700" />

      <div className="relative max-w-4xl mx-auto px-6 py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Instant Connection</span>
          </motion.div>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-6"
          >
            Ready to Get{" "}
            <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
              Connected?
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Choose your perfect package, pay with M-Pesa, and get online in seconds. 
            No complicated setup, no waiting around.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button 
              asChild 
              size="lg" 
              className="group bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 text-base px-8"
            >
              <Link href="/" className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <span className="font-semibold">Get Started Now</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="group border-2 hover:bg-muted/50 text-base px-8"
            >
              <Link href="#packages" className="flex items-center gap-2">
                <span className="font-semibold">View All Plans</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-6 lg:gap-8 mt-12 pt-8 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Instant Activation</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">M-Pesa Payment</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">24/7 Support</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default CtaSection