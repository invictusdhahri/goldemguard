'use client'

import { type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export default function Button({ 
  children, 
  loading = false, 
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
  ...props 
}: ButtonProps) {
  const baseStyles = "relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden active:scale-95"

  const variants = {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 border-none",
    secondary: "bg-slate-900/60 backdrop-blur-md hover:bg-slate-800/80 text-white border border-white/10 hover:border-cyan-500/40",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/40",
    ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white border border-transparent hover:border-white/10"
  }

  const isDisabled = disabled || loading

  return (
    <motion.button
      type={type}
      whileHover={{ scale: isDisabled ? 1 : 1.01 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      disabled={isDisabled}
      className={cn(baseStyles, variants[variant], className)}
      {...props as any}
    >
      {/* Animated Shine Effect for Primary */}
      {variant === 'primary' && !isDisabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
      )}
      
      <div className={cn("flex items-center justify-center gap-2", loading ? "opacity-0" : "opacity-100")}>
        {children}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-inherit opacity-100" aria-hidden />
        </div>
      )}
    </motion.button>
  )
}
