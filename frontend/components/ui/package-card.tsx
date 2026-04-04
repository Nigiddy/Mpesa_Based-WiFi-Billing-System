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
  value?: number
}

interface PackageCardProps {
  package: PackageOption
  isSelected: boolean
  onSelect: () => void
  variant?: 'simple' | 'premium'
  index?: number
  disabled?: boolean
  showFeatures?: boolean
  onClick?: () => void
}

/**
 * Consolidated PackageCard component
 * Replaces both PackageCard.tsx and PremiumPackageCard.tsx
 * variant="simple" for minimal cards, variant="premium" for feature-rich
 */
export const PackageCard = React.forwardRef<HTMLDivElement, PackageCardProps>(
  (
    {
      package: pkg,
      isSelected,
      onSelect,
      variant = 'simple',
      index = 0,
      disabled = false,
      showFeatures = true,
      onClick,
    },
    ref
  ) => {
    const isPremium = variant === 'premium'

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
        y: isPremium ? -8 : 0,
        transition: { duration: 0.3 },
      },
    }

    const defaultFeatures = [
      { icon: Zap, label: pkg.speed || '2 Mbps', color: 'text-primary' },
      { icon: Database, label: pkg.data || '2 GB', color: 'text-secondary' },
      { icon: Clock, label: pkg.duration || '24 Hours', color: 'text-success' },
    ]

    // Simple variant
    if (variant === 'simple') {
      return (
        <motion.div
          onClick={onSelect}
          className={cn(
            'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 text-center',
            isSelected
              ? 'border-primary bg-primary/10 shadow-lg'
              : 'border-border bg-background hover:border-primary/50',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
          whileHover={!disabled ? { scale: 1.05 } : undefined}
          whileTap={!disabled ? { scale: 0.95 } : undefined}
          aria-pressed={isSelected}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
              e.preventDefault()
              onSelect()
            }
          }}
          aria-label={`${pkg.label} - KSh ${pkg.price}${pkg.description ? ' - ' + pkg.description : ''}`}
          aria-disabled={disabled}
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
              <CheckCircle className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="text-lg font-bold">{pkg.label}</div>
          <div className="text-2xl font-extrabold text-primary my-1">
            KSh {pkg.price.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">{pkg.speed}</div>
        </motion.div>
      )
    }

    // Premium variant
    return (
      <motion.div
        ref={ref}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        whileHover={!disabled ? 'hover' : undefined}
        onClick={() => !disabled && onSelect()}
        className="h-full"
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault()
            onSelect()
          }
        }}
        aria-label={`${pkg.label} - KSh ${pkg.price}${pkg.description ? ' - ' + pkg.description : ''}`}
      >
        <Card
          className={cn(
            'h-full cursor-pointer relative overflow-hidden transition-all duration-300',
            isSelected && 'ring-2 ring-primary shadow-lg',
            !disabled && 'hover:shadow-lg hover:border-primary/50',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {/* Popular Badge */}
          {pkg.popular && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="absolute -top-2 -right-2 z-10"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary to-primary rounded-full blur-lg opacity-50" />
                <div className="relative bg-gradient-to-r from-secondary to-primary text-white px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-lg">
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
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
              </div>
            </motion.div>
          )}

          {/* Glow effect for popular packages */}
          {pkg.popular && isSelected && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 animate-pulse pointer-events-none" aria-hidden="true" />
          )}

          {/* Content */}
          <div className="p-6 lg:p-8 flex flex-col h-full">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl lg:text-2xl font-bold text-foreground">
                {pkg.label}
              </h3>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {pkg.description}
                </p>
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
                <p className="text-xs font-medium text-success mt-2">
                  {pkg.badge}
                </p>
              )}
            </div>

            {/* Features */}
            {showFeatures && (
              <div className="space-y-3 mb-8 flex-grow">
                {defaultFeatures.map((feature, idx) => {
                  const IconComponent = feature.icon
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <IconComponent
                        className={cn('w-4 h-4', feature.color)}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-muted-foreground">
                        {feature.label}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* CTA Button */}
            <Button
              onClick={() => !disabled && onSelect()}
              disabled={disabled || isSelected}
              className="w-full"
              variant={isSelected ? 'secondary' : 'default'}
              aria-label={
                isSelected
                  ? `${pkg.label} selected`
                  : `Select ${pkg.label} package`
              }
            >
              {isSelected ? '✓ Selected' : 'Select Package'}
            </Button>
          </div>
        </Card>
      </motion.div>
    )
  }
)

PackageCard.displayName = 'PackageCard'

export default PackageCard
