"use client"

import { Card, CardContent } from "@/components/ui/card"

export const FaqSection = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
        Frequently Asked Questions
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How do I pay?</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Simply select your package and pay using M-Pesa. You'll receive instant access once payment is
              confirmed.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Is there a data limit?</h3>
            <p className="text-slate-600 dark:text-slate-400">
              No, all our packages offer unlimited data usage during the specified time period.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Can I extend my session?</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Yes, you can purchase additional time before your current session expires.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">What if I have issues?</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Our support team is available 24/7 to help you with any connectivity or payment issues.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
