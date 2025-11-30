"use client"

import { useState, useEffect } from "react"
import { Phone, Package, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PaymentSuccessModal } from "@/components/payment-success-modal"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"
import { apiClient, type PaymentRequest } from "@/lib/api"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import TrustIndicators from "@/components/TrustIndicators"
import PackageCard from "@/components/PackageCard"
import StatusDisplay from "@/components/StatusDisplay"
import DeviceInfoPanel from "@/components/DeviceInfoPanel"
import InfoPanel from "@/components/InfoPanel"
import { motion } from "framer-motion"

// --- Constants ---
const packages = [
  { label: "24 Hours", value: 30, price: "Ksh 30", speed: "5 Mbps", popular: true },
  { label: "12 Hours", value: 20, price: "Ksh 20", speed: "4 Mbps", popular: false },
  { label: "4 Hours", value: 15, price: "Ksh 15", speed: "3 Mbps", popular: false },
  { label: "1 Hour", value: 10, price: "Ksh 10", speed: "2 Mbps", popular: false },
]

// --- Main Component ---
export default function UserPortal() {
  useDynamicTitle("Get Connected Instantly")
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(30)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [macAddress, setMacAddress] = useState("Loading...")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)

  useEffect(() => {
    fetchDeviceInfo()
  }, [])

  const fetchDeviceInfo = async () => {
    try {
      const response = await apiClient.getDeviceInfo()
      if (response.success && response.data) {
        setMacAddress(response.data.macAddress)
      } else {
        throw new Error(response.error || "Failed to fetch device info")
      }
    } catch (error) {
      console.error("Error fetching device info:", error)
      setMacAddress("UNAVAILABLE")
      toast.error("Could not retrieve device information.")
    }
  }

  const handlePayment = async () => {
    if (!/^(07|01)\d{8}$/.test(phone)) {
      toast.error("Invalid phone number.", {
        description: "Please enter a valid 10-digit number (e.g., 0712345678).",
      })
      return
    }

    const selectedPackage = packages.find((p) => p.value === amount)
    if (!selectedPackage) return

    setIsLoading(true)
    setStatus("pending")
    toast.loading(`Initiating M-Pesa payment for ${selectedPackage.price}...`, {
      id: "payment-toast",
    })

    try {
      const paymentPayload: PaymentRequest = {
        phone: `254${phone.substring(1)}`,
        amount,
        package: selectedPackage.label,
        macAddress,
        speed: selectedPackage.speed,
      }
      
      const response = await apiClient.initiatePayment(paymentPayload)

      if (response.success && response.data) {
        setTransactionId(response.data.transactionId)
        pollPaymentStatus(response.data.transactionId)
      } else {
        throw new Error(response.error || "Payment initiation failed")
      }
    } catch (error) {
      setStatus("failed")
      toast.error("Payment Error", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        id: "payment-toast",
      })
      setIsLoading(false)
    }
  }

  const pollPaymentStatus = async (txnId: string) => {
    // ... polling logic remains the same
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setPhone(value)
  }

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header />
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
        <Footer />
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
