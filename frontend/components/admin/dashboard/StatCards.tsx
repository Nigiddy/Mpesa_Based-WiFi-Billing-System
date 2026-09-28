'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StatCardData {
  icon: React.ReactNode
  label: string
  value: string | number
  change: number
  period: string
  trend: 'up' | 'down' | 'neutral'
  gradient?: string
  animated?: boolean
}
