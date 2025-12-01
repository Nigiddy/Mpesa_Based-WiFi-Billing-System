"use client"

import { Phone, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaymentSuccessModal } from "@/components/payment-success-modal"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import TrustIndicators from "@/components/TrustIndicators"
import PackageCard from "@/components/PackageCard"
import StatusDisplay from "@/components/StatusDisplay"
import DeviceInfoPanel from "@/components/DeviceInfoPanel"
import InfoPanel from "@/components/InfoPanel"
import { motion } from "framer-motion"
import { packages } from "@/lib/packages"
import { usePayment } from "@/hooks/use-payment"

// --- Main Component ---
export default function UserPortal() {
  useDynamicTitle("Get Connected Instantly")
  const {
    phone,
    amount,
    status,
    isLoading,
    macAddress,
    showSuccessModal,
    paymentData,
    handlePhoneChange,
    setAmount,
    handlePayment,
    setShowSuccessModal,
  } = usePayment()

  return (
    <>
      <div className="min-h-screen text-gray-900 dark:text-gray-100">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-5xl mx-auto">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-4">
                Seamless WiFi Access
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
                Get online in seconds. Choose a package, pay with M-Pesa, and enjoy
                high-speed internet. It's that simple.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-12">
              {/* Payment Form (Left) */}
              <div className="lg:col-span-3">
                <Card className="bg-background/80 backdrop-blur-sm border-border/60">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <Zap className="w-5 h-5 mr-2 text-primary" />
                      Instant Connection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-medium">
                        M-Pesa Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="0712 345 678"
                          value={phone}
                          onChange={handlePhoneChange}
                          className="pl-10 h-12 text-base"
                          maxLength={10}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="font-medium">Select a Package</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {packages.map((pkg) => (
                          <PackageCard
                            key={pkg.value}
                            pkg={pkg}
                            isSelected={amount === pkg.value}
                            onSelect={() => setAmount(pkg.value)}
                          />
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={isLoading || phone.length !== 10}
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      ) : (
                        `Pay ${packages.find((p) => p.value === amount)?.price}`
                      )}
                    </Button>
                    <StatusDisplay status={status} />
                  </CardContent>
                </Card>
              </div>

              {/* Info Panel (Right) */}
              <div className="lg:col-span-2 space-y-6">
                <DeviceInfoPanel macAddress={macAddress} />
                <InfoPanel />
              </div>
            </div>

            <TrustIndicators />
          </div>
        </main>
        {paymentData && (
          <PaymentSuccessModal
            isOpen={showSuccessModal}
            onClose={() => setShowSuccessModal(false)}
            paymentData={paymentData}
          />
        )}
      </div>
    </>
  )
}
