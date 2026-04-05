'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 group">
        {label && (
          <label className="block text-sm font-medium text-muted-foreground group-focus-within:text-cyan transition-colors duration-200 ml-0.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-cyan/60 transition-colors duration-200 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-xl",
              "bg-input border border-border",
              "text-foreground placeholder:text-muted-foreground/40",
              "focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-cyan/30",
              "hover:border-border/60",
              "transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "text-sm",
              icon && "pl-10",
              iconRight && "pr-10",
              error && "border-destructive/50 focus:ring-destructive/30 focus:border-destructive/40",
              className
            )}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-cyan/60 transition-colors duration-200 pointer-events-none">
              {iconRight}
            </div>
          )}

          {/* Focus glow line */}
          <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-transparent via-cyan/50 to-transparent group-focus-within:w-full transition-all duration-400 opacity-0 group-focus-within:opacity-100" />
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 text-xs text-destructive ml-0.5"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          ) : hint ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground ml-0.5"
            >
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
