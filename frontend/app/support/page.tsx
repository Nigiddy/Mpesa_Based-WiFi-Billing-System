"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useDynamicTitle } from "@/hooks/use-dynamic-title"
import { motion } from "framer-motion"
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  HelpCircle, 
  Send, 
  Headphones,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield
} from "lucide-react"
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
    icon: Phone,
    title: "Phone Support",
    description: "Call us for immediate help",
    contact: "+254 700 000 000",
    href: "tel:+254700000000",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    available: "24/7 Available",
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Get answers within a few hours",
    contact: "support@qonnect.co.ke",
    href: "mailto:support@qonnect.co.ke",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    available: "Response in 24hrs",
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with us during business hours",
    contact: "Start a chat",
    href: "#chat",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    available: "Mon-Fri, 8am-8pm",
  },
]

const faqs = [
  {
    question: "How do I pay for a package?",
    answer:
      "You can pay using M-Pesa on our homepage. Select a package, enter your number, and you'll get a payment prompt.",
    icon: Shield,
  },
  {
    question: "Is there a data limit?",
    answer: "No, all packages come with unlimited data for the selected duration.",
    icon: Zap,
  },
  {
    question: "What if my payment fails?",
    answer:
      "Please check your M-Pesa balance and try again. If it still fails, contact us with the transaction details.",
    icon: AlertCircle,
  },
  {
    question: "How do I connect to the WiFi?",
    answer:
      "After payment, you'll be automatically granted access. Just connect to the 'Qonnect' WiFi network.",
    icon: CheckCircle2,
  },
]

const quickTips = [
  {
    icon: AlertCircle,
    title: "Payment Issues",
    description: "Check your M-Pesa balance and ensure your number is correct",
    color: "text-red-600",
  },
  {
    icon: Zap,
    title: "Connection Problems",
    description: "Try moving closer to the router or restart your device",
    color: "text-yellow-600",
  },
  {
    icon: Clock,
    title: "Package Expired",
    description: "Purchase a new package from our portal to reconnect instantly",
    color: "text-blue-600",
  },
]

export default function SupportPage() {
  useDynamicTitle("Support - Qonnect")
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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
        setSubmitted(true)
        setTimeout(() => setSubmitted(false), 5000)
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
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-20 lg:py-28">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 relative"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Headphones className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">We're Here to Help</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Support{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
                Center
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We're here to help. Find answers to common questions or get in
              touch with our support team.
            </p>
          </motion.div>
        </div>

        {/* Contact Methods Grid */}
        <div className="py-12 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose your preferred way to reach us
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20">
            {contactMethods.map((method, index) => {
              const IconComponent = method.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="h-full bg-background/50 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                    <CardContent className="p-6 text-center">
                      <div className={`w-16 h-16 rounded-xl ${method.bgColor} flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className={`w-8 h-8 ${method.color}`} />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {method.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {method.description}
                      </p>
                      <p className="text-base font-semibold text-foreground mb-2">
                        {method.contact}
                      </p>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-4">
                        <Clock className="w-3 h-3" />
                        {method.available}
                      </div>
                      <Button 
                        asChild
                        className="w-full"
                        variant="outline"
                      >
                        <a href={method.href}>Contact</a>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Contact Form & Quick Tips */}
        <div className="grid lg:grid-cols-2 gap-12 py-12 mb-20 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-background/50 backdrop-blur-sm border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Send className="w-6 h-6 text-primary" />
                  Send Us a Message
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fill out the form below and we'll get back to you shortly
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      placeholder="John Doe"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      value={formData.message} 
                      onChange={handleInputChange} 
                      rows={5}
                      placeholder="Describe your issue or question..."
                      className="resize-none"
                    />
                  </div>

                  {submitted && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-600">
                        Message sent successfully! We'll be in touch soon.
                      </span>
                    </motion.div>
                  )}

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full bg-gradient-to-r from-primary to-blue-600 h-11" 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Quick Tips
              </h2>
              <p className="text-muted-foreground">
                Common solutions to get you back online faster
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {quickTips.map((tip, index) => {
                const IconComponent = tip.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="bg-background/50 backdrop-blur-sm border-border/60 hover:border-primary/50 transition-all duration-300">
                      <CardContent className="p-5">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <IconComponent className={`w-5 h-5 ${tip.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">
                              {tip.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {tip.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Office Info */}
            <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Visit Our Office
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Kimathi Street, Nairobi CBD<br />
                      Kenya
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Monday - Friday: 8:00 AM - 6:00 PM<br />
                      Saturday: 9:00 AM - 2:00 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* FAQ Section */}
        <div className="py-12 mb-20 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">FAQ</span>
            </div>
            
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Common Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Find quick answers to frequently asked questions
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => {
                const IconComponent = faq.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <AccordionItem 
                      value={`item-${index}`}
                      className="border border-border rounded-xl px-6 bg-background/50 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300 data-[state=open]:border-primary data-[state=open]:shadow-lg data-[state=open]:shadow-primary/10"
                    >
                      <AccordionTrigger className="text-left font-semibold hover:no-underline py-6 group">
                        <div className="flex items-start gap-4 pr-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                            <IconComponent className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-base lg:text-lg text-foreground">
                            {faq.question}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-6 pl-14 pr-4">
                        <p className="text-base leading-relaxed">
                          {faq.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                )
              })}
            </Accordion>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}