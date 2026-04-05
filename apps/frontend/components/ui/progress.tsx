"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: "default" | "cyan" | "purple" | "success" | "gradient"
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = "default", ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    const fillStyles: Record<string, string> = {
      default: "bg-primary",
      cyan: "bg-cyan",
      purple: "bg-purple",
      success: "bg-verified",
      gradient: "",
    }

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          "relative h-1.5 w-full overflow-hidden rounded-full bg-secondary",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            variant !== "gradient" && fillStyles[variant]
          )}
          style={{
            width: `${percentage}%`,
            ...(variant === "gradient"
              ? {
                  background: "linear-gradient(90deg, #00d4ff, #8b5cf6)",
                  boxShadow: "0 0 8px rgba(0,212,255,0.4)",
                }
              : {}),
          }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
