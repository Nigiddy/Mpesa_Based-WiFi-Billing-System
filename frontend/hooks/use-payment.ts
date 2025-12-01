"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { apiClient, type PaymentRequest } from "@/lib/api"
import { packages } from "@/lib/packages"

export function usePayment() {
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
    const interval = setInterval(async () => {
      try {
        const response = await apiClient.checkPaymentStatus(txnId)
        if (response.success && response.data?.status === "completed") {
          clearInterval(interval)
          setStatus("completed")
          setIsLoading(false)
          setPaymentData(response.data.paymentDetails)
          setShowSuccessModal(true)
          toast.success("Payment successful!", {
            id: "payment-toast",
            description: `Your ${response.data.paymentDetails.package} package is now active.`,
          })
        } else if (response.success && response.data?.status === "failed") {
          clearInterval(interval)
          setStatus("failed")
          setIsLoading(false)
          toast.error("Payment Failed", {
            id: "payment-toast",
            description: response.data.message || "Please try again.",
          })
        }
        // If status is still pending, the loop continues
      } catch (error) {
        clearInterval(interval)
        setStatus("failed")
        setIsLoading(false)
        toast.error("Polling Error", {
          id: "payment-toast",
          description: "Could not confirm payment status.",
        })
      }
    }, 5000) // Poll every 5 seconds

    // Timeout after 2 minutes
    setTimeout(() => {
      if (status === "pending") {
        clearInterval(interval)
        setStatus("failed")
        setIsLoading(false)
        toast.error("Payment Timeout", {
          id: "payment-toast",
          description: "Could not confirm payment. Please check your M-Pesa.",
        })
      }
    }, 120000)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setPhone(value)
  }

  return {
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
  }
}
