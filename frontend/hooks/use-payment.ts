"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { apiClient, type PaymentRequest, type PaymentResponse } from "@/lib/api"
import { packages } from "@/lib/packages"
import { formatDate } from "@/lib/utils"

import { useSearchParams } from "next/navigation"

export function usePayment() {
  const [phone, setPhone] = useState("")
  const [amount, setAmount] = useState(30)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [status, setStatus] = useState<"pending" | "completed" | "failed" | "timeout" | "">("")
  const [isLoading, setIsLoading] = useState(false)
  const [macAddress, setMacAddress] = useState("Loading...")
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null)
  // Capture the URL the user was trying to reach before being caught by the captive portal.
  // MikroTik injects this as ?link-orig=<url> (or ?link-login-only=<url>).
  const [linkOrig, setLinkOrig] = useState<string>('')
  const cleanupPolling = useRef<(() => void) | null>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Capture intended destination for post-payment redirect
    const requestedOrig = searchParams.get('link-orig')
      || searchParams.get('link-login-only')
      || searchParams.get('linkOrig')
    const orig = getSafeRedirectUrl(requestedOrig)
    setLinkOrig(orig)

    const macFromUrl = searchParams.get("mac")
    if (macFromUrl) {
      setMacAddress(macFromUrl)
      // Check for active session
      apiClient.checkSessionStatus(macFromUrl).then(response => {
        if (response.success && response.data?.hasActiveSession) {
          setHasActiveSession(true)
          toast.info("You already have an active session.", {
            description: `It expires at ${formatDate(response.data.expiresAt!)}`,
          })
          // Redirect to intended destination — they're already connected
          if (orig) redirectTimer.current = setTimeout(() => { window.location.assign(orig) }, 2500)
        }
      })
    } else {
      setMacAddress("UNAVAILABLE")
      toast.error("Device MAC Address not found.", {
        description: "Please ensure you are connected to the Hotspot WiFi.",
      })
    }
    return () => {
      cleanupPolling.current?.()
      cleanupPolling.current = null
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
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
        package: selectedPackage.key,
        macAddress,
        speed: selectedPackage.speed,
      }

      const response = await apiClient.initiatePayment(paymentPayload)

      if (response.success && response.data) {
        setTransactionId(response.data.transactionId)
        cleanupPolling.current?.()
        cleanupPolling.current = pollPaymentStatus(response.data.transactionId)
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

  const pollPaymentStatus = (txnId: string) => {
    let active = true
    let interval: NodeJS.Timeout | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const poll = () => {
      interval = setInterval(async () => {
        if (!active) return

        try {
          const response = await apiClient.checkPaymentStatus(txnId)
          
          if (!active || !interval) return

          if (response.success && response.data?.status === "completed") {
            if (interval) clearInterval(interval)
            interval = null
            if (timeoutId) clearTimeout(timeoutId)
            
            if (active) {
              setStatus("completed")
              setIsLoading(false)
              setPaymentData(response.data)
              setShowSuccessModal(true)
              toast.success("Payment successful!", {
                id: "payment-toast",
                description: `WiFi access granted until ${response.data.expiresAt ? formatDate(response.data.expiresAt) : 'session expires'}. Redirecting…`,
              })
              if (linkOrig) redirectTimer.current = setTimeout(() => { window.location.assign(linkOrig) }, 3000)
            }
          } else if (response.success && (response.data?.status === "failed" || response.data?.status === "timeout" || response.data?.status === "not_found")) {
            if (interval) clearInterval(interval)
            interval = null
            if (timeoutId) clearTimeout(timeoutId)
            
            if (active) {
              setStatus(response.data.status === "timeout" ? "timeout" : "failed")
              setIsLoading(false)
              toast.error("Payment Failed", {
                id: "payment-toast",
                description: "Your payment was declined or cancelled. Please try again.",
              })
            }
          }
        } catch (error) {
          if (!active) return
          if (interval) clearInterval(interval)
          if (timeoutId) clearTimeout(timeoutId)
          interval = null

          if (active) {
            setStatus("failed")
            setIsLoading(false)
            toast.error("Polling Error", {
              id: "payment-toast",
              description: "Could not confirm payment status.",
            })
          }
        }
      }, 5000)
    }

    poll()

    timeoutId = setTimeout(() => {
      if (active && interval) {
        clearInterval(interval)
        interval = null
        
        setStatus("timeout")
        setIsLoading(false)
        toast.error("Payment Timeout", {
          id: "payment-toast",
          description: "Could not confirm payment. Please check your M-Pesa.",
        })
      }
    }, 120000)

    return () => {
      active = false
      if (interval) {
        clearInterval(interval)
        interval = null
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }
  }

  const cancelPayment = () => {
    cleanupPolling.current?.()
    cleanupPolling.current = null
    setIsLoading(false)
    setStatus("")
    setTransactionId(null)
    setPaymentData(null)
    setShowSuccessModal(false)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "")
    setPhone(value)
  }

  return {
    phone,
    amount,
    transactionId,
    status,
    isLoading,
    macAddress,
    hasActiveSession,
    showSuccessModal,
    paymentData,
    handlePhoneChange,
    setAmount,
    handlePayment,
    cancelPayment,
    retryPayment: handlePayment,
    setShowSuccessModal,
  }
}

function getSafeRedirectUrl(value: string | null): string {
  if (!value) return ''

  try {
    const url = new URL(value, window.location.origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    if (url.origin === window.location.origin) return url.href

    const allowedPortalOrigin = process.env.NEXT_PUBLIC_PORTAL_ORIGIN
    return allowedPortalOrigin && url.origin === allowedPortalOrigin ? url.href : ''
  } catch {
    return ''
  }
}
