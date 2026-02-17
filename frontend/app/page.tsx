"use client"

import { Phone, Shield, Wifi, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { packages } from "@/lib/packages"
import { usePayment } from "@/hooks/use-payment"

export default function UserPortal() {
  useDynamicTitle("Get Connected - KIBARUANI")
  
  const {
    phone,
    amount,
    isLoading,
    macAddress,
    handlePhoneChange,
    setAmount,
    handlePayment,
  } = usePayment()

  return (
    <div className="min-h-screen bg-background py-20 flex items-center justify-center">
      <main className="container mx-auto px-4 max-w-md">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Wifi className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Get Connected
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant WiFi access powered by M-Pesa.
          </p>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm"
        >
          <div className="space-y-8">
            
            {/* Step 1: Phone */}
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-sm font-semibold text-foreground">
                1. M-Pesa Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712 345 678"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={10}
                  className="pl-10 h-12 bg-background"
                />
              </div>
            </div>

            {/* Step 2: Package */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">
                2. Select Package
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {packages.slice(0, 4).map((pkg) => (
                  <button
                    key={pkg.value}
                    onClick={() => setAmount(pkg.value)}
                    className={`p-3 rounded-xl border transition-all text-center ${
                      amount === pkg.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="font-bold text-foreground">
                      KSh {pkg.price}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pkg.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Payment Action */}
            <div className="pt-2">
              <Button
                onClick={handlePayment}
                disabled={isLoading || phone.length !== 10 || !amount}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  `Pay KSh ${packages.find((p) => p.value === amount)?.price || "0"}`
                )}
              </Button>
            </div>
            
          </div>
        </motion.div>

        {/* Minimal Footer / Trust Signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 flex flex-col items-center gap-3 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" /> Secure
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> Verified
            </span>
          </div>
          <code className="bg-muted/50 px-2 py-1 rounded">
            Device: {macAddress || "Detecting..."}
          </code>
        </motion.div>

      </main>
    </div>
  )
}