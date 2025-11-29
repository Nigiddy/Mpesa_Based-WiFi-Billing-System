"use client"

import Link from "next/link"

export const HeroSection = () => {
  return (
    <div className="text-center mb-16">
      <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
        Choose Your
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Perfect Package
        </span>
      </h1>
      <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto">
        Select from our range of affordable internet packages designed to meet your specific needs. All packages
        include secure M-Pesa payment and instant activation.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">10,000+</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Happy Customers</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">99.9%</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Uptime</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">24/7</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Support</div>
        </div>
      </div>
    </div>
  )
}
