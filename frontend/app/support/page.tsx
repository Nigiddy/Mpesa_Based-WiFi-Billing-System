"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { Phone, Mail, MessageCircle, HelpCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

const contactMethods = [
  {
    icon: <Phone />,
    title: "Phone Support",
    description: "Call us for immediate help.",
    contact: "+254 700 000 000",
  },
  {
    icon: <Mail />,
    title: "Email Support",
    description: "Get answers within a few hours.",
    contact: "support@qonnect.co.ke",
  },
  {
    icon: <MessageCircle />,
    title: "Live Chat",
    description: "Chat with us during business hours.",
    contact: "Start a chat",
  },
]

const faqs = [
  {
    question: "How do I pay for a package?",
    answer:
      "You can pay using M-Pesa on our homepage. Select a package, enter your number, and you'll get a payment prompt.",
  },
  {
    question: "Is there a data limit?",
    answer: "No, all packages come with unlimited data for the selected duration.",
  },
  {
    question: "What if my payment fails?",
    answer:
      "Please check your M-Pesa balance and try again. If it still fails, contact us with the transaction details.",
  },
  {
    question: "How do I connect to the WiFi?",
    answer:
      "After payment, you'll be automatically granted access. Just connect to the 'Qonnect' WiFi network.",
  },
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
      toast.error("Failed to send message.", {
        description: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <HelpCircle className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-4">
            Support Center
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            We're here to help. Find answers to common questions or get in
            touch with our support team.
          </p>
        </motion.div>

        {/* Contact & Form Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          {/* Contact Methods */}
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-foreground">Get in Touch</h2>
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex items-start space-x-4"
              >
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                  {method.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {method.title}
                  </h3>
                  <p className="text-muted-foreground">{method.description}</p>
                  <p className="text-primary font-medium">{method.contact}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-background/80 backdrop-blur-sm border-border/60">
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" value={formData.message} onChange={handleInputChange} rows={4} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-3xl font-extrabold text-center text-foreground mb-8">
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-semibold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>

      <Footer />
    </div>
  )
}
