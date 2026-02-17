'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Zap, Database, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PackageOption {
  id: string | number
  label: string
  description?: string
  price: number
  period?: string
  speed?: string
  data?: string
  duration?: string
  features?: string[]
  popular?: boolean
  badge?: string
}

interface PremiumPackageCardProps {
  package: PackageOption
  isSelected: boolean
  isPopular?: boolean
  onSelect: () => void
  index?: number
  disabled?: boolean
}

export const PremiumPackageCard = ({
  package: pkg,
  isSelected,
  isPopular = pkg.popular,
  onSelect,
  index = 0,
  disabled = false,
}: PremiumPackageCardProps) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
        ease: 'easeOut',
      },
    },
  }

  const hoverVariants = {
    hover: {
      y: -8,
      transition: { duration: 0.3 },
    },
  }

  const defaultFeatures = [
    { icon: Zap, label: pkg.speed || '2 Mbps', color: 'text-primary' },
    { icon: Database, label: pkg.data || '2 GB', color: 'text-secondary' },
    { icon: Clock, label: pkg.duration || '24 Hours', color: 'text-success' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover={!disabled ? "hover" : undefined}
      onClick={onSelect}
      className="h-full"
    >
      <Card
        variant={isSelected ? 'interactive' : 'default'}
        className={cn(
          'h-full cursor-pointer relative overflow-hidden transition-all duration-300',
          isSelected && 'ring-2 ring-primary shadow-lg-premium',
          !disabled && 'hover:shadow-lg-premium hover:border-primary/50',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {/* Popular Badge */}
        {isPopular && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary rounded-full blur-lg opacity-50" />
              <div className="relative bg-gradient-to-r from-secondary to-primary text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg-premium">
                ⭐ POPULAR
              </div>
            </div>
          </motion.div>
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 left-4 z-10"
          >
            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
              <CheckCircle className="w-5 h-5" />
            </div>
          </motion.div>
        )}

        {/* Glow effect for popular packages */}
        {isPopular && isSelected && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 animate-pulse pointer-events-none" />
        )}

        {/* Content */}
        <div className="p-6 lg:p-8 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6">
            <h3 className="text-xl lg:text-2xl font-bold text-foreground">{pkg.label}</h3>
            {pkg.description && (
              <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl lg:text-4xl font-bold text-primary">
                KSh {pkg.price.toLocaleString()}
              </span>
              {pkg.period && (
                <span className="text-muted-foreground text-sm font-medium">
                  /{pkg.period}
                </span>
              )}
            </div>
            {pkg.badge && (
              <p className="text-xs font-medium text-success mt-2">{pkg.badge}</p>
            )}
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8 flex-grow">
            {defaultFeatures.map((feature, idx) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn('p-2 rounded-lg bg-primary/10', feature.color)}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-muted-foreground">{feature.label}</span>
                </motion.div>
              )
            })}

            {pkg.features && pkg.features.length > 0 && (
              <>
                {pkg.features.map((feature, idx) => (
                  <motion.div
                    key={`custom-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="flex items-start gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </motion.div>
                ))}
              </>
            )}
          </div>

          {/* CTA Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={isSelected ? 'premium' : 'outline'}
              size="lg"
              fullWidth
              disabled={disabled}
              className={cn(
                'transition-all duration-300',
                isSelected && 'bg-gradient-to-r from-primary to-secondary'
              )}
            >
              {isSelected ? '✓ Selected' : 'Select Plan'}
            </Button>
          </motion.div>

          {/* Fine Print */}
          {pkg.period === 'month' && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Auto-renew available · Cancel anytime
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

/**
 * Package Grid Container
 */
interface PackageGridProps {
  packages: PackageOption[]
  selectedId?: string | number
  onSelect: (id: string | number) => void
  isLoading?: boolean
  disabled?: boolean
}

export const PremiumPackageGrid = ({
  packages,
  selectedId,
  onSelect,
  isLoading = false,
  disabled = false,
}: PackageGridProps) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
        {packages.map((pkg, index) => (
          <PremiumPackageCard
            key={pkg.id}
            package={pkg}
            isSelected={selectedId === pkg.id}
            isPopular={pkg.popular}
            onSelect={() => onSelect(pkg.id)}
            index={index}
            disabled={disabled || isLoading}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Package Comparison Table
 */
export const PackageComparisonTable = ({ packages }: { packages: PackageOption[] }) => {
  const features = ['Speed', 'Data', 'Duration', 'Price']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full overflow-x-auto"
    >
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-primary/20">
            <th className="text-left py-4 px-4 font-semibold">Feature</th>
            {packages.map((pkg) => (
              <th key={pkg.id} className="text-center py-4 px-4 font-semibold">
                {pkg.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => (
            <tr key={feature} className="border-b border-border/50 hover:bg-primary/5 transition-colors">
              <td className="py-3 px-4 font-medium text-muted-foreground">{feature}</td>
              {packages.map((pkg) => (
                <td key={pkg.id} className="py-3 px-4 text-center">
                  {feature === 'Speed' && pkg.speed}
                  {feature === 'Data' && pkg.data}
                  {feature === 'Duration' && pkg.duration}
                  {feature === 'Price' && `KSh ${pkg.price.toLocaleString()}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

export default PremiumPackageCard
