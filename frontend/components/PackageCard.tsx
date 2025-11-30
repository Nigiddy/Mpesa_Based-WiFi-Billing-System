import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Package {
  label: string
  price: string
  speed: string
  popular: boolean
}

const PackageCard = ({ pkg, isSelected, onSelect }: { pkg: Package; isSelected: boolean; onSelect: () => void }) => {
  return (
    <motion.div
      onClick={onSelect}
      className={cn(
        "relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 text-center",
        isSelected
          ? "border-primary bg-primary/10 shadow-lg"
          : "border-border bg-background hover:border-primary/50"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary rounded-full">
            POPULAR
          </span>
        </div>
      )}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-5 h-5 text-primary" />
        </div>
      )}
      <div className="text-lg font-bold">{pkg.label}</div>
      <div className="text-2xl font-extrabold text-primary my-1">{pkg.price}</div>
      <div className="text-sm text-muted-foreground">{pkg.speed}</div>
    </motion.div>
  )
}

export default PackageCard
