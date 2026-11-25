export interface FaqItem {
  question: string
  answer: string
}

export const supportFaqs: FaqItem[] = [
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
