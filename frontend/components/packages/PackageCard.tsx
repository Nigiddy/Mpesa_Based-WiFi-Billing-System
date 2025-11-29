"use client"

import { CheckCircle, Wifi, Zap, Clock, Star, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export const PackageCard = ({ pkg }) => {
  const colorClasses = {
    yellow: "border-yellow-500 bg-yellow-500/5",
    green: "border-green-500 bg-green-500/5",
    purple: "border-purple-500 bg-purple-500/5",
    blue: "border-blue-500 bg-blue-500/5",
  }

  const handleSelectPackage = () => {
    toast.success(`${pkg.name} package selected!`, {
      description: `Redirecting to payment for Ksh ${pkg.price}`,
      duration: 3000,
    })
    // Redirect to home page with selected package
    setTimeout(() => {
      window.location.href = `/?package=${pkg.id}`
    }, 1500)
  }

  return (
    <Card
      className={`relative transition-all duration-300 hover:scale-105 hover:shadow-lg ${
        pkg.popular ? `${colorClasses[pkg.color]} shadow-lg` : "border-slate-200 dark:border-white/10"
      } bg-white/50 dark:bg-slate-800/50 backdrop-blur`}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1">
            <Star className="w-3 h-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
          <Wifi className="w-8 h-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{pkg.name}</CardTitle>
        <p className="text-slate-600 dark:text-slate-400">{pkg.description}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price */}
        <div className="text-center">
          <div className="text-4xl font-bold text-slate-900 dark:text-white">
            Ksh {pkg.price}
            <span className="text-lg font-normal text-slate-600 dark:text-slate-400">/{pkg.duration}</span>
          </div>
        </div>

        {/* Speed & Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            <Zap className="w-5 h-5 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">{pkg.speed}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Speed</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            <Clock className="w-5 h-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
            <p className="text-sm font-medium text-slate-900 dark:text-white">{pkg.duration}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Duration</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-900 dark:text-white">What's included:</h4>
          <ul className="space-y-2">
            {pkg.features.map((feature, index) => (
              <li key={index} className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleSelectPackage}
          className={`w-full h-12 font-semibold transition-all duration-300 ${
            pkg.popular
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100"
          }`}
        >
          Pay with M-Pesa - Ksh {pkg.price}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
