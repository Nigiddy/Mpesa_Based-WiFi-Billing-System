import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, CheckCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative",
  {
    variants: {
      variant: {
        // Primary CTA - strong, action-oriented
        default: cn(
          "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
          "hover:shadow-lg hover:-translate-y-0.5",
          "active:shadow-md active:translate-y-0",
          "dark:from-primary dark:to-primary/80"
        ),

        // Premium primary (enhanced for critical actions)
        premium: cn(
          "bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground",
          "hover:shadow-xl hover:-translate-y-1",
          "active:shadow-lg active:translate-y-0",
          "dark:from-primary dark:via-primary/85 dark:to-primary/75",
          "relative overflow-hidden",
          "before:absolute before:inset-0 before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
        ),

        // Destructive - error, delete actions
        destructive: cn(
          "bg-destructive text-destructive-foreground",
          "hover:shadow-lg hover:-translate-y-0.5 hover:bg-destructive/90",
          "active:shadow-md active:translate-y-0",
          "dark:opacity-90"
        ),

        // Outline - secondary actions
        outline: cn(
          "border-2 border-primary bg-background text-foreground",
          "hover:bg-primary/5 hover:border-primary/80",
          "active:bg-primary/10",
          "dark:hover:bg-primary/10"
        ),

        // Ghost - tertiary, minimal
        ghost: cn(
          "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
          "active:bg-slate-200 dark:active:bg-slate-700",
          "transition-colors"
        ),

        // Secondary action
        secondary: cn(
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/80 hover:shadow-md",
          "active:bg-secondary/90"
        ),

        // Link style
        link: "text-primary underline-offset-4 hover:underline",

        // Success state (for post-payment actions)
        success: cn(
          "bg-success text-success-foreground",
          "hover:shadow-lg hover:-translate-y-0.5",
          "active:shadow-md"
        ),

        // Warning state
        warning: cn(
          "bg-warning text-warning-foreground",
          "hover:shadow-lg hover:-translate-y-0.5",
          "active:shadow-md"
        ),
      },

      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base rounded-xl",
        xl: "h-14 px-8 text-base rounded-xl",
        icon: "h-10 w-10 rounded-lg",
        "icon-sm": "h-8 w-8 rounded-md",
        "icon-lg": "h-12 w-12 rounded-xl",
      },

      loading: {
        true: "pointer-events-none opacity-75",
      },

      fullWidth: {
        true: "w-full",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  success?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      success = false,
      loadingText = "Loading...",
      disabled,
      children,
      fullWidth,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(
          buttonVariants({
            variant,
            size,
            loading,
            className,
          })
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            <span>{loadingText}</span>
          </>
        ) : success ? (
          <>
            <CheckCircle className="mr-1 h-4 w-4 animate-checkmark" />
            <span>Success!</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
