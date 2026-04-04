import { AnimatePresence, motion } from "framer-motion"
import { getStatusColorClasses } from "@/lib/color-tokens"

const statusMessageMap = {
  pending: "Waiting for M-Pesa payment...",
  completed: "Payment successful! You are connected.",
  success: "Payment successful! You are connected.",
  failed: "Payment failed. Please try again.",
  "": "Status will appear here.",
}

const StatusDisplay = ({ status }: { status: "pending" | "completed" | "success" | "failed" | "" }) => {
  const colors = getStatusColorClasses(status || "")
  const message = statusMessageMap[status as keyof typeof statusMessageMap] || "Processing..."

  return (
    <div className="text-sm font-medium text-center text-muted-foreground pt-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center justify-center p-3 rounded-lg border ${colors.bg} ${colors.border}`}
          role="status"
          aria-live="polite"
          aria-label={message}
        >
          <span className="ml-2">{message}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default StatusDisplay
