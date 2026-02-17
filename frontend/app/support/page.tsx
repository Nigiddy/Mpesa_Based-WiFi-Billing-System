"use client"

import { useState } from "react"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Phone, Mail, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

const contactMethods = [
  { icon: Phone, label: "Call Us", value: "+254 700 000 000", href: "tel:+254700000000" },
  { icon: Mail, label: "Email", value: "support@qonnect.co.ke", href: "mailto:support@qonnect.co.ke" },
  { icon: MessageCircle, label: "Live Chat", value: "Start a conversation", href: "#chat" },
]

const faqs = [
  {
    question: "How do I pay for a package?",
    answer: "You can pay using M-Pesa on our homepage. Select a package, enter your number, and you'll get a payment prompt on your phone."
  },
  {
    question: "What if my payment fails?",
    answer: "Check your M-Pesa balance and ensure your number is correct. If the issue persists, contact us with the transaction details."
  },
  {
    question: "How do I connect after paying?",
    answer: "After payment, you are automatically granted access. Just connect your device to the 'Qonnect' WiFi network."
  },
  {
    question: "My package expired, how do I reconnect?",
    answer: "Simply visit our portal again and purchase a new package to instantly restore your connection."
  },
  {
    question: "Connection problems?",
    answer: "Try moving closer to the router or restarting your device. If that doesn't work, reach out via the form below."
  }
]

export default function SupportPage() {
  useDynamicTitle("Support - Qonnect")
  
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all fields.")
      return
    }

    setIsSubmitting(true)
    toast.loading("Sending your message...")

    try {
      const response = await apiClient.submitSupportRequest(formData)
      if (response.success) {
        toast.success("Message sent! We'll get back to you soon.")
        setFormData({ name: "", email: "", message: "" })
      } else {
        throw new Error(response.error || "An unknown error occurred.")
      }
    } catch (error) {
      toast.error("Failed to send message.", { description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-20">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center lg:text-left"
        >
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            How can we help?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Find quick answers below, or reach out to our team directly.
          </p>
        </motion.div>

        {/* Quick Contact Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20 pb-12 border-b border-border/50"
        >
          {contactMethods.map((method, index) => {
            const Icon = method.icon
            return (
              <a 
                key={index} 
                href={method.href}
                className="flex flex-col items-center sm:items-start p-4 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <Icon className="w-6 h-6 text-primary mb-3" />
                <span className="font-semibold text-foreground">{method.label}</span>
                <span className="text-sm text-muted-foreground">{method.value}</span>
              </a>
            )
          })}
        </motion.div>

        {/* Form and FAQ Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column: Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Send a Message</h2>
              <p className="text-sm text-muted-foreground">We usually respond within a few hours.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="John Doe" className="h-12 bg-transparent" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="john@example.com" className="h-12 bg-transparent" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" value={formData.message} onChange={handleInputChange} rows={5} placeholder="How can we help you today?" className="resize-none bg-transparent" />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-base font-semibold">
                {isSubmitting ? "Sending..." : (
                  <>
                    <Send className="w-4 h-4 mr-2" /> Send Message
                  </>
                )}
              </Button>
            </form>
          </motion.div>

          {/* Right Column: FAQs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border/50 px-1">
                  <AccordionTrigger className="text-left font-medium hover:no-underline py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>

        </div>
      </main>
    </div>
  )
}