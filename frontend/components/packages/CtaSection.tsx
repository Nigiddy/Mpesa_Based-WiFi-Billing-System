"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export const CtaSection = () => {
  return (
    <div className="text-center my-20">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          Ready to Get Connected?
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose a package on our homepage and get online in seconds.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/">
            Get Started
          </Link>
        </Button>
      </div>
    </div>
  )
}
