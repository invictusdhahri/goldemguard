'use client'

import { type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 font-semibold transition-all',
        variant === 'primary' &&
          'btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'secondary' &&
          'rounded-lg border border-slate-600 bg-slate-800/80 px-4 py-2 text-slate-200 hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'ghost' &&
          'btn-ghost justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
}
