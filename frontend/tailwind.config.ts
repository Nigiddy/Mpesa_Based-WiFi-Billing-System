import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'slide-up': {
          from: { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          to: { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'scale-up': {
          from: { 
            opacity: '0',
            transform: 'scale(0.95)'
          },
          to: { 
            opacity: '1',
            transform: 'scale(1)'
          }
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
          }
        },
        'processing-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.25)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)'
          }
        },
        'checkmark': {
          '0%': { 
            transform: 'scale(0) rotate(-45deg)'
          },
          '50%': { 
            transform: 'scale(1.1)'
          },
          '100%': { 
            transform: 'scale(1) rotate(0deg)'
          }
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' }
        },
        'confetti': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) rotate(0deg) scale(1)'
          },
          '100%': {
            opacity: '0',
            transform: 'translateY(-100px) rotate(720deg) scale(0)'
          }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 300ms ease-out forwards',
        'slide-up': 'slide-up 400ms ease-out forwards',
        'scale-up': 'scale-up 300ms ease-out forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'processing-glow': 'processing-glow 2s ease-in-out infinite',
        'checkmark': 'checkmark 500ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shake': 'shake 400ms ease-in-out',
        'confetti': 'confetti 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        'shimmer': 'shimmer 2s infinite'
      },
      boxShadow: {
        'sm-premium': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'premium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg-premium': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl-premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        'success-glow': '0 0 20px rgba(16, 185, 129, 0.25)',
        'processing-glow': '0 0 20px rgba(99, 102, 241, 0.25)',
        'error-glow': '0 0 20px rgba(239, 68, 68, 0.25)'
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem'
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'sharp': 'cubic-bezier(0.4, 0, 0.6, 1)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
