"use client"

import { Check, Star, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export const PackageOfferCard = ({ pkg, index = 0 }) => {
  const handleSelectPackage = () => {
    // Logic to handle package selection
    window.location.href = `/?package=${pkg.id}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8 }}
      className="relative h-full"
    >
      <Card
        className={cn(
          "flex flex-col h-full transition-all duration-300 overflow-hidden",
          pkg.popular
            ? "border-2 border-primary shadow-xl shadow-primary/20 scale-105"
            : "border border-border hover:border-primary/50 hover:shadow-lg",
          "bg-gradient-to-b from-background to-background/50 backdrop-blur-sm"
        )}
      >
        {/* Popular badge */}
        {pkg.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-primary to-blue-600 rounded-full flex items-center shadow-lg">
              <Star className="w-3.5 h-3.5 mr-1.5 fill-white" />
              MOST POPULAR
            </span>
          </div>
        )}

        {/* Decorative corner gradient */}
        {pkg.popular && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
        )}

        <CardHeader className="text-center pt-12 pb-6 relative">
          <CardTitle className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            {pkg.name}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{pkg.description}</p>
        </CardHeader>

        <CardContent className="flex-grow space-y-6 px-6">
          {/* Pricing section */}
          <div className="text-center py-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-semibold text-muted-foreground">Ksh</span>
              <span className={cn(
                "text-5xl lg:text-6xl font-extrabold tracking-tight",
                pkg.popular ? "bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent" : "text-foreground"
              )}>
                {pkg.price}
              </span>
            </div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted">
              <span className="text-sm font-medium text-muted-foreground">{pkg.duration}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Features list */}
          <ul className="space-y-3.5">
            {pkg.features.map((feature, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 + idx * 0.05 }}
                className="flex items-start gap-3"
              >
                <div className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
                  pkg.popular ? "bg-primary/10" : "bg-green-500/10"
                )}>
                  <Check className={cn(
                    "w-3.5 h-3.5",
                    pkg.popular ? "text-primary" : "text-green-600"
                  )} />
                </div>
                <span className="text-sm text-foreground leading-relaxed">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="pt-6 pb-6 px-6">
          <Button
            onClick={handleSelectPackage}
            className={cn(
              "w-full group relative overflow-hidden transition-all duration-300",
              pkg.popular 
                ? "bg-gradient-to-r from-primary to-blue-600 hover:shadow-lg hover:shadow-primary/30" 
                : ""
            )}
            variant={pkg.popular ? "default" : "outline"}
            size="lg"
          >
            <span className="flex items-center justify-center gap-2">
              {pkg.popular && <Zap className="w-4 h-4" />}
              <span className="font-semibold">Choose Plan</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
          
          {/* M-Pesa indicator */}
          <p className="text-xs text-center text-muted-foreground mt-3">
            Pay securely with M-Pesa
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default PackageOfferCard