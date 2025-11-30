"use client"

import { motion } from "framer-motion"

export const HeroSection = () => {
  return (
    <div className="text-center mb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-4 text-foreground">
          Find the Perfect Plan
        </h1>
        <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
          From casual browsing to intensive streaming, we have a WiFi package
          that fits your lifestyle and budget.
        </p>
      </motion.div>
    </div>
  )
}
