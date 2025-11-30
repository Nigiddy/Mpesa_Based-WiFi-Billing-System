"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "How do I pay for a package?",
    answer:
      "You can pay using M-Pesa. Just select your desired package on the homepage, enter your phone number, and you'll receive a prompt on your phone to complete the payment.",
  },
  {
    question: "Is the internet access unlimited?",
    answer:
      "Yes, all our packages provide unlimited data access for the duration of the plan. There are no data caps or hidden fees.",
  },
  {
    question: "Can I use the internet on multiple devices?",
    answer:
      "Each package is valid for a single device at a time. To use the internet on another device, you can either wait for the current session to expire or purchase a new package for the new device.",
  },
  {
    question: "What happens when my package expires?",
    answer:
      "Your internet access will be disconnected. You can easily reconnect by purchasing a new package from our portal.",
  },
  {
    question: "Who can I contact for support?",
    answer:
      "Our support team is available 24/7. You can find our contact details on the support page or by calling our toll-free number.",
  },
]

export const FaqSection = () => {
  return (
    <div className="max-w-3xl mx-auto mb-20">
      <h2 className="text-3xl font-extrabold text-center text-foreground mb-8">
        Frequently Asked Questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
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
  )
}
