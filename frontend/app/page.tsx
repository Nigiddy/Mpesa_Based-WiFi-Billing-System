"use client"

import { Phone, Zap, Wifi, Shield, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="relative overflow-hidden mb-16">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center relative"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Instant Activation • M-Pesa Payment</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                Seamless{" "}
                <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
                  WiFi Access
                </span>
              </h1>
              <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
                Get online in seconds. Choose a package, pay with M-Pesa, and enjoy
                high-speed internet. It's that simple.
              </p>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-wrap justify-center gap-6 lg:gap-8"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Wifi className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium">High-Speed</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium">Instant</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium">Secure</span>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
            {/* Payment Form (Left) */}
            <motion.div 
              className="lg:col-span-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="bg-background/50 backdrop-blur-sm border-border/60 shadow-xl">
                <CardHeader className="border-b border-border/60 pb-6">
                  <CardTitle className="flex items-center text-2xl">
                    <div className="p-2 rounded-lg bg-primary/10 mr-3">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    Instant Connection
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete your purchase in three simple steps
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Step 1: Phone Number */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        1
                      </div>
                      <Label htmlFor="phone" className="font-semibold text-base">
                        Enter M-Pesa Number
                      </Label>
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0712 345 678"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-11 h-12 text-base border-2 focus:border-primary"
                        maxLength={10}
                      />
                    </div>
                    {phone.length > 0 && phone.length !== 10 && (
                      <p className="text-xs text-muted-foreground">
                        {10 - phone.length} digits remaining
                      </p>
                    )}
                  </div>

                  {/* Step 2: Select Package */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        2
                      </div>
                      <Label className="font-semibold text-base">Select a Package</Label>
                    </div>
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

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>
                  </div>

                  {/* Step 3: Payment Button */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        3
                      </div>
                      <Label className="font-semibold text-base">Complete Payment</Label>
                    </div>
                    <Button
                      onClick={handlePayment}
                      disabled={isLoading || phone.length !== 10}
                      className="w-full h-14 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            Pay {packages.find((p) => p.value === amount)?.price}
                            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                          </span>
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      You'll receive an M-Pesa prompt on your phone
                    </p>
                  </div>

                  <StatusDisplay status={status} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Info Panels (Right) */}
            <motion.div 
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <DeviceInfoPanel macAddress={macAddress} />
              <InfoPanel />
            </motion.div>
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <TrustIndicators />
          </motion.div>
        </div>
      </main>

      <Footer />

      {paymentData && (
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          paymentData={paymentData}
        />
      )}
    </div>
  )
}