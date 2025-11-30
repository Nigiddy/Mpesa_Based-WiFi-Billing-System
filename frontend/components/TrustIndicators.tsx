import { Shield, Users, Globe, Wifi } from "lucide-react"
import { motion } from "framer-motion"

const trustItems = [
  {
    icon: <Shield className="h-6 w-6 text-green-500" />,
    title: "Secure Payments",
    description: "All transactions are encrypted and protected.",
  },
  {
    icon: <Users className="h-6 w-6 text-blue-500" />,
    title: "Trusted by Many",
    description: "Join our growing community of happy users.",
  },
  {
    icon: <Wifi className="h-6 w-6 text-purple-500" />,
    title: "High-Speed Access",
    description: "Blazing-fast internet for all your needs.",
  },
]

const TrustIndicators = () => {
  return (
    <div className="mt-20">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
        {trustItems.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="flex flex-col items-center p-6 bg-background rounded-lg"
          >
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mb-4">
              {item.icon}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export default TrustIndicators
