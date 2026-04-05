'use client'

import { type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-cyan to-cyan-dim text-primary-foreground shadow-lg shadow-cyan/25 hover:shadow-cyan/45 hover:-translate-y-0.5 border-none",
        secondary:
          "bg-secondary/60 backdrop-blur-md hover:bg-secondary/80 text-secondary-foreground border border-border hover:border-cyan/30",
        ghost:
          "bg-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border",
        outline:
          "bg-transparent border border-border text-foreground hover:bg-muted",
        danger:
          "bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/40",
        accent:
          "bg-gradient-to-r from-purple to-purple-dim text-accent-foreground shadow-lg shadow-purple/25 hover:shadow-purple/45 hover:-translate-y-0.5 border-none",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-xs",
        default: "h-10 rounded-xl px-6 py-2.5 text-sm",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base font-bold",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
  }

export default function Button({
  children,
  loading = false,
  variant = 'primary',
  size = 'default',
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      whileHover={{ scale: isDisabled ? 1 : 1.01 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, size }), className)}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {/* Shine effect on primary/accent */}
      {(variant === 'primary' || variant === 'accent') && !isDisabled && (
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
      )}

      <span className={cn("flex items-center justify-center gap-2", loading && "opacity-0")}>
        {children}
      </span>

      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        </span>
      )}
    </motion.button>
  )
}

export { buttonVariants }
