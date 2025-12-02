"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { motion } from "framer-motion"
import { HelpCircle, CreditCard, Wifi, Smartphone, Clock, Headphones } from "lucide-react"

const faqs = [
  {
    question: "How do I pay for a package?",
    answer:
      "You can pay using M-Pesa. Just select your desired package on the homepage, enter your phone number, and you'll receive a prompt on your phone to complete the payment.",
    icon: CreditCard,
  },
  {
    question: "Is the internet access unlimited?",
    answer:
      "Yes, all our packages provide unlimited data access for the duration of the plan. There are no data caps or hidden fees.",
    icon: Wifi,
  },
  {
    question: "Can I use the internet on multiple devices?",
    answer:
      "Each package is valid for a single device at a time. To use the internet on another device, you can either wait for the current session to expire or purchase a new package for the new device.",
    icon: Smartphone,
  },
  {
    question: "What happens when my package expires?",
    answer:
      "Your internet access will be disconnected. You can easily reconnect by purchasing a new package from our portal.",
    icon: Clock,
  },
  {
    question: "Who can I contact for support?",
    answer:
      "Our support team is available 24/7. You can find our contact details on the support page or by calling our toll-free number.",
    icon: Headphones,
  },
]

export const FaqSection = () => {
  return (
    <div className="max-w-4xl mx-auto mb-20 lg:mb-32 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <HelpCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Got Questions?</span>
        </div>
        
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
          Frequently Asked{" "}
          <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
            Questions
          </span>
        </h2>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about our WiFi packages and M-Pesa payment process.
        </p>
      </motion.div>

      {/* FAQ Accordion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Accordion type="single" collapsible className="w-full space-y-4">
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

      {/* Still have questions CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="mt-12 text-center"
      >
        <div className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border">
          <Headphones className="w-8 h-8 text-primary" />
          <p className="text-base font-medium text-foreground">
            Still have questions?
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            Our support team is available 24/7 to help you get connected. Reach out anytime!
          </p>
          <button className="mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors duration-300">
            Contact Support
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default FaqSection