"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { apiClient, type PaymentRequest } from "@/lib/api"
import { packages } from "@/lib/packages"

import { useSearchParams } from "next/navigation"

export function usePayment() {
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(30)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [macAddress, setMacAddress] = useState("Loading...")
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentData, setPaymentData] = useState<any>(null)
  // Capture the URL the user was trying to reach before being caught by the captive portal.
  // MikroTik injects this as ?link-orig=<url> (or ?link-login-only=<url>).
  const [linkOrig, setLinkOrig] = useState<string>('http://google.com')
  const searchParams = useSearchParams()

  useEffect(() => {
    // Capture intended destination for post-payment redirect
    const orig = searchParams.get('link-orig')
      || searchParams.get('link-login-only')
      || searchParams.get('linkOrig')
      || 'http://google.com'
    setLinkOrig(orig)

    const macFromUrl = searchParams.get("mac")
    if (macFromUrl) {
      setMacAddress(macFromUrl)
      // Check for active session
      apiClient.checkSessionStatus(macFromUrl).then(response => {
        if (response.success && response.data?.hasActiveSession) {
          setHasActiveSession(true)
          console.log("User has active session, expires at:", response.data.expiresAt)
          toast.info("You already have an active session.", {
            description: `It expires at ${new Date(response.data.expiresAt!).toLocaleString()}`,
          })
          // Redirect to intended destination — they're already connected
          setTimeout(() => { window.location.href = orig }, 2500)
        }
      })
    } else {
      setMacAddress("UNAVAILABLE")
      toast.error("Device MAC Address not found.", {
        description: "Please ensure you are connected to the Hotspot WiFi.",
      })
    }
  }, [searchParams])

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
          setPaymentData(response.data)  // PaymentResponse shape: { status, mpesaRef, expiresAt }
          setShowSuccessModal(true)
          toast.success("Payment successful!", {
            id: "payment-toast",
            description: `WiFi access granted until ${response.data.expiresAt ? new Date(response.data.expiresAt).toLocaleTimeString() : 'session expires'}. Redirecting…`,
          })
          // Redirect to the user’s intended destination after a short delay
          // so they can see the success toast before being navigated away.
          setTimeout(() => { window.location.href = linkOrig }, 3000)
        } else if (response.success && response.data?.status === "failed") {
          clearInterval(interval)
          setStatus("failed")
          setIsLoading(false)
          toast.error("Payment Failed", {
            id: "payment-toast",
            description: "Your payment was declined or cancelled. Please try again.",
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
    hasActiveSession,
    showSuccessModal,
    paymentData,
    handlePhoneChange,
    setAmount,
    handlePayment,
    setShowSuccessModal,
  }
}
