"use client"

import { Check, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"

export const PackageCard = ({ pkg }) => {
  const handleSelectPackage = () => {
    // Logic to handle package selection
    window.location.href = `/?package=${pkg.id}`
  }

  return (
    <Card
      className={cn(
        "flex flex-col transition-all duration-300",
        pkg.popular
          ? "border-primary shadow-lg"
          : "border-border hover:border-primary/50",
        "bg-background/80 backdrop-blur-sm"
      )}
    >
      {pkg.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-semibold text-white bg-primary rounded-full flex items-center">
            <Star className="w-3 h-3 mr-1" />
            POPULAR
          </span>
        </div>
      )}

      <CardHeader className="text-center pt-10">
        <CardTitle className="text-2xl font-bold text-foreground">{pkg.name}</CardTitle>
        <p className="text-muted-foreground">{pkg.description}</p>
      </CardHeader>

      <CardContent className="flex-grow space-y-6">
        <div className="text-center">
          <span className="text-4xl font-extrabold text-foreground">Ksh {pkg.price}</span>
          <span className="text-muted-foreground">/{pkg.duration}</span>
        </div>

        <ul className="space-y-3 text-sm">
          {pkg.features.map((feature, index) => (
            <li key={index} className="flex items-center">
              <Check className="w-4 h-4 mr-2 text-green-500" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSelectPackage}
          className="w-full"
          variant={pkg.popular ? "default" : "outline"}
        >
          Choose Plan
        </Button>
      </CardFooter>
    </Card>
  )
}
