'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5 group">
        {label && (
          <label className="block text-sm font-medium text-slate-400 group-focus-within:text-cyan-400 transition-colors duration-300 ml-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-500/70 transition-colors duration-300">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              `
              w-full px-4 py-3 rounded-xl
              bg-slate-900/40 backdrop-blur-md border border-white/5
              text-white placeholder-slate-600
              focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/30
              transition-all duration-300
              hover:border-white/10 hover:bg-slate-900/60
              disabled:opacity-50 disabled:cursor-not-allowed
              `,
              icon && 'pl-11',
              error ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500/30' : '',
              className
            )}
            {...props}
          />
          
          {/* Subtle bottom glow effect on focus */}
          <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent group-focus-within:w-full transition-all duration-500 opacity-0 group-focus-within:opacity-100" />
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-xs text-red-500/90 ml-1 mt-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
