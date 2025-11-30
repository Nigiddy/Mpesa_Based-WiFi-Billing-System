import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react"

const statusConfig = {
  pending: {
    icon: <Clock className="w-5 h-5 text-yellow-500" />,
    text: "Waiting for M-Pesa payment...",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
  },
  completed: {
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    text: "Payment successful! You are connected.",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  failed: {
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    text: "Payment failed. Please try again.",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  "": {
    icon: <XCircle className="w-5 h-5 text-gray-500" />,
    text: "Status will appear here.",
    bg: "bg-muted/50",
    border: "border-border",
  },
}

const StatusDisplay = ({ status }: { status: "pending" | "completed" | "failed" | "" }) => {
  const config = statusConfig[status || ""]

  return (
    <div className="text-sm font-medium text-center text-muted-foreground pt-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center justify-center p-3 rounded-lg border ${config.bg} ${config.border}`}
        >
          {config.icon}
          <span className="ml-2">{config.text}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default StatusDisplay
