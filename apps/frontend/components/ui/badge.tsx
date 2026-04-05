import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/15 text-destructive border-destructive/25",
        outline:
          "text-foreground border-border",
        cyan:
          "text-[color:var(--color-cyan)] border-[color:var(--color-cyan)]/20 bg-[color:var(--color-cyan)]/10",
        purple:
          "text-[color:var(--color-purple)] border-[color:var(--color-purple)]/20 bg-[color:var(--color-purple)]/10",
        verified:
          "text-[color:var(--color-verified)] border-[color:var(--color-verified)]/20 bg-[color:var(--color-verified)]/10",
        warning:
          "text-[color:var(--color-warn)] border-[color:var(--color-warn)]/20 bg-[color:var(--color-warn)]/10",
        ai:
          "text-[color:var(--color-ai)] border-[color:var(--color-ai)]/20 bg-[color:var(--color-ai)]/10",
        muted:
          "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
