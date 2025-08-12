"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Clock, AlertTriangle, Phone, Package, Zap, Shield, Users, Globe, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { PaymentSuccessModal } from "@/components/payment-success-modal"
import { ToastProvider } from "@/components/toast-provider"
import { toast } from "sonner"
import { apiClient, type PaymentRequest } from "@/lib/api"

// --- Constants ---
const packages = [
  { label: "24 Hours", value: 30, price: "Ksh 30", speed: "5 Mbps", color: "blue", popular: true },
  { label: "12 Hours", value: 20, price: "Ksh 20", speed: "4 Mbps", color: "purple", popular: false },
  { label: "4 Hours", value: 15, price: "Ksh 15", speed: "3 Mbps", color: "green", popular: false },
  { label: "1 Hour", value: 10, price: "Ksh 10", speed: "2 Mbps", color: "yellow", popular: false },
]

// --- Trust Indicators Component ---
const TrustIndicators = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div className="flex items-center space-x-3 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
        <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Secure Payment</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">M-Pesa Protected</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">10,000+ Users</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Trusted Daily</p>
        </div>
      </div>
      <div className="flex items-center space-x-3 p-4 rounded-lg bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-white/5">
        <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">99.9% Uptime</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">Reliable Connection</p>
        </div>
      </div>
    </div>
  )
}

// --- Package Card Component ---
const PackageCard = ({ pkg, isSelected, onSelect }) => {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-500/10 shadow-blue-500/20",
    purple: "border-purple-500 bg-purple-500/10 shadow-purple-500/20",
    green: "border-green-500 bg-green-500/10 shadow-green-500/20",
    yellow: "border-yellow-500 bg-yellow-500/10 shadow-yellow-500/20",
  }

  const handleSelect = () => {
    onSelect(pkg.value)
    toast.success(`Selected ${pkg.label} package`, {
      description: `${pkg.price} - ${pkg.speed} speed`,
      duration: 2000,
    })
  }

  return (
    <Card
      className={`relative cursor-pointer transition-all duration-300 hover:scale-105 ${
        isSelected
          ? `${colorClasses[pkg.color]} shadow-lg`
          : "border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/70"
      }`}
      onClick={handleSelect}
    >
      {pkg.popular && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            <Star className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}
      <CardContent className="p-4 text-center">
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{pkg.price}</div>
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-2">{pkg.label}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{pkg.speed}</div>
      </CardContent>
    </Card>
  )
}

// --- Status Display Component ---
const StatusDisplay = ({ status }) => {
  if (!status) return null

  const statusConfig = {
    pending: {
      icon: Clock,
      className: "bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300",
      text: "Processing payment...",
      iconClass: "animate-pulse",
    },
    completed: {
      icon: CheckCircle,
      className: "bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300",
      text: "Payment successful! You're connected.",
      iconClass: "",
    },
    failed: {
      icon: AlertTriangle,
      className: "bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300",
      text: "Payment failed. Please try again.",
      iconClass: "",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={`flex items-center justify-center p-4 rounded-lg border transition-all duration-300 ${config.className}`}
    >
      <Icon className={`w-5 h-5 mr-3 ${config.iconClass}`} />
      <span className="font-medium">{config.text}</span>
    </div>
  )
}

// --- Main Component ---
export default function UserPortal() {
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
      toast.info("Fetching device information...", { duration: 2000 })

      const response = await apiClient.getDeviceInfo()

      if (response.success && response.data) {
        setMacAddress(response.data.macAddress)
        toast.success("Device information loaded", { duration: 2000 })
      } else {
        throw new Error(response.error || "Failed to fetch device info")
      }
    } catch (error) {
      console.error("Error fetching device info:", error)
      setMacAddress("UNAVAILABLE")
      toast.error("Could not retrieve device information", {
        description: "Please refresh the page and try again",
      })
    }
  }

  const handlePayment = async () => {
    // Validation
    if (!/^(07|01)\d{8}$/.test(phone)) {
      toast.error("Invalid phone number", {
        description: "Please enter a valid 10-digit phone number starting with 07 or 01",
      })
      return
    }

    if (!amount) {
      toast.error("No package selected", {
        description: "Please select a package before proceeding",
      })
      return
    }

    setIsLoading(true)
    setStatus("pending")

    const selectedPackage = packages.find((p) => p.value === amount)

    toast.loading("Initiating M-Pesa payment...", {
      description: `${selectedPackage.price} for ${selectedPackage.label}`,
      id: "payment-loading",
    })

    try {
      const paymentPayload: PaymentRequest = {
        phone: `+254${phone.substring(1)}`,
        amount,
        package: selectedPackage.label,
        macAddress,
        speed: selectedPackage.speed,
      }

      console.log("Payment payload:", paymentPayload)

      const response = await apiClient.initiatePayment(paymentPayload)

      if (response.success && response.data) {
        const { transactionId: txnId, mpesaRef, status: paymentStatus, expiresAt } = response.data

        setTransactionId(txnId)
        setStatus(paymentStatus)

        if (paymentStatus === "completed") {
          const successPaymentData = {
            transactionId: txnId,
            amount,
            package: selectedPackage.label,
            phone: `+254${phone.substring(1)}`,
            mpesaRef,
            expiresAt,
            speed: selectedPackage.speed,
          }

          setPaymentData(successPaymentData)

          toast.dismiss("payment-loading")
          toast.success("Payment successful!", {
            description: "You are now connected to the internet",
            duration: 4000,
          })

          setTimeout(() => {
            setShowSuccessModal(true)
          }, 1000)
        } else if (paymentStatus === "pending") {
          // Poll for payment status
          pollPaymentStatus(txnId)
        }
      } else {
        throw new Error(response.error || "Payment initiation failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      setStatus("failed")
      toast.dismiss("payment-loading")
      toast.error("Payment error", {
        description: error.message || "An unexpected error occurred. Please try again.",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const pollPaymentStatus = async (txnId: string) => {
    const maxAttempts = 30 // 5 minutes with 10-second intervals
    let attempts = 0

    const poll = async () => {
      try {
        const response = await apiClient.checkPaymentStatus(txnId)

        if (response.success && response.data) {
          const { status: paymentStatus, mpesaRef, expiresAt } = response.data

          if (paymentStatus === "completed") {
            const selectedPackage = packages.find((p) => p.value === amount)
            const successPaymentData = {
              transactionId: txnId,
              amount,
              package: selectedPackage.label,
              phone: `+254${phone.substring(1)}`,
              mpesaRef,
              expiresAt,
              speed: selectedPackage.speed,
            }

            setPaymentData(successPaymentData)
            setStatus("completed")

            toast.dismiss("payment-loading")
            toast.success("Payment successful!", {
              description: "You are now connected to the internet",
              duration: 4000,
            })

            setTimeout(() => {
              setShowSuccessModal(true)
            }, 1000)
            return
          } else if (paymentStatus === "failed") {
            setStatus("failed")
            toast.dismiss("payment-loading")
            toast.error("Payment failed", {
              description: "Please check your M-Pesa balance and try again",
              duration: 4000,
            })
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000) // Poll every 10 seconds
        } else {
          setStatus("failed")
          toast.dismiss("payment-loading")
          toast.error("Payment timeout", {
            description: "Payment is taking longer than expected. Please contact support.",
            duration: 4000,
          })
        }
      } catch (error) {
        console.error("Error polling payment status:", error)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        }
      }
    }

    poll()
  }

  const handlePhoneChange = (e) => {
    const value = e.target.value
    setPhone(value)

    // Real-time validation feedback
    if (value && !/^(07|01)\d{0,8}$/.test(value)) {
      toast.error("Invalid format", {
        description: "Phone number should start with 07 or 01",
        duration: 2000,
      })
    }
  }

  return (
    <>
      <ToastProvider />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Header />

        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-4">
                Get Connected
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  Instantly
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-2xl mx-auto">
                Choose your internet package and pay securely with M-Pesa. Fast, reliable, and affordable internet
                access.
              </p>
            </div>

            <TrustIndicators />

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              {/* Payment Form */}
              <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                    Quick Payment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Phone Input */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      M-Pesa Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 dark:focus:border-blue-400"
                      maxLength={10}
                    />
                  </div>

                  {/* Package Selection */}
                  <div className="space-y-4">
                    <Label className="text-slate-700 dark:text-slate-300 flex items-center">
                      <Package className="w-4 h-4 mr-2" />
                      Select Package
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {packages.map((pkg) => (
                        <PackageCard key={pkg.value} pkg={pkg} isSelected={amount === pkg.value} onSelect={setAmount} />
                      ))}
                    </div>
                  </div>

                  {/* Payment Button */}
                  <Button
                    onClick={handlePayment}
                    disabled={isLoading || !phone || phone.length !== 10}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-300 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Pay with M-Pesa - {packages.find((p) => p.value === amount)?.price}
                      </>
                    )}
                  </Button>

                  <StatusDisplay status={status} />
                </CardContent>
              </Card>

              {/* Info Panel */}
              <div className="space-y-6">
                <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Why Choose Qonnect?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">Lightning Fast</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">High-speed internet up to 5 Mbps</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400 mt-1" />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">Secure Payments</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Protected M-Pesa transactions</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-1" />
                      <div>
                        <h3 className="font-medium text-slate-900 dark:text-white">Reliable Network</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">99.9% uptime guarantee</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">Device Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">MAC Address:</span>
                        <span className="text-slate-900 dark:text-white font-mono text-sm">{macAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Status:</span>
                        <Badge
                          variant="outline"
                          className={
                            status === "completed"
                              ? "text-green-600 dark:text-green-400 border-green-600 dark:border-green-400"
                              : "text-yellow-600 dark:text-yellow-400 border-yellow-600 dark:border-yellow-400"
                          }
                        >
                          {status === "completed" ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <Footer />

        {/* Success Modal */}
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
