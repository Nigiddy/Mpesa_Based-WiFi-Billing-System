/**
 * Premium Fintech Design Tokens
 * Centralized design system for consistent, scalable UI
 * Inspired by Stripe, Wise, Flutterwave
 */

export const colors = {
  // Success: M-Pesa Green + Emerald gradient
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBEF45',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#10B981', // M-Pesa primary
    700: '#059669',
    800: '#047857',
    900: '#065F46',
  },

  // Primary: Indigo (Action, CTAs)
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1', // Main blue
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },

  // Secondary: Violet (Accents, highlights)
  secondary: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },

  // Warning: Amber (Caution, timeouts)
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Error: Red (Payment failures, alerts)
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Neutral: True gray (Backgrounds, borders)
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
}

export const shadows = {
  // Elevation system (layered)
  elevation: {
    0: 'none',
    1: '0 1px 2px rgba(0, 0, 0, 0.05)',
    2: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    3: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    4: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    5: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    6: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // Payment success glow
  successGlow: '0 0 20px rgba(16, 185, 129, 0.25)',

  // Payment processing glow
  processingGlow: '0 0 20px rgba(99, 102, 241, 0.25)',

  // Error glow
  errorGlow: '0 0 20px rgba(239, 68, 68, 0.25)',

  // Hover interactive
  interactive: '0 4px 12px rgba(0, 0, 0, 0.12)',
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
}

export const borderRadius = {
  none: '0px',
  sm: '4px',
  base: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
}

export const transitions = {
  fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  slower: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  verySlow: '700ms cubic-bezier(0.4, 0, 0.2, 1)',
}

export const gradients = {
  // Success moment
  successGradient: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',

  // Primary action
  primaryGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',

  // Payment processing
  processingGradient: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',

  // Elevated background
  elevatedGradient: 'linear-gradient(180deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.4) 100%)',
}

export const zIndex = {
  hide: '-1',
  auto: 'auto',
  base: '0',
  dropdown: '1000',
  sticky: '1100',
  fixed: '1200',
  backdrop: '1300',
  offcanvas: '1050',
  modal: '1400',
  popover: '1500',
  toast: '1600',
  tooltip: '1700',
}

// Breakpoints (Tailwind standards)
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Animation/Motion tokens
export const animation = {
  // Durations
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    standard: 300,
    complex: 375,
    enteringScreen: 225,
    leavingScreen: 195,
  },

  // Easing functions
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    linear: 'linear',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
}

// Accessibility
export const accessibility = {
  focusRing: 'ring-2 ring-primary ring-offset-2 ring-offset-background',
  srOnly: 'sr-only',
}
