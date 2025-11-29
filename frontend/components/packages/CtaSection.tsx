"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const CtaSection = () => {
  return (
    <div className="text-center mt-16">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white max-w-2xl mx-auto">
        <CardContent className="p-8">
          <h3 className="text-2xl font-bold mb-4">Ready to Get Connected?</h3>
          <p className="mb-6 opacity-90">
            Join thousands of satisfied customers enjoying fast, reliable internet access.
          </p>
          <Link href="/">
            <Button className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-8 py-3">
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
