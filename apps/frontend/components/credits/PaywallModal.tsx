'use client';

import { X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Button, { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PaywallModal({ open, onOpenChange }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        style={{ boxShadow: '0 0 0 1px var(--border), 0 25px 50px -12px rgba(0,0,0,0.35)' }}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border-subtle)',
            }}
          >
            <Sparkles className="h-5 w-5 text-cyan" />
          </div>
          <div>
            <h2 id="paywall-title" className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Trial credits used up
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upgrade to keep analyzing media, using Verify Chat, and the browser extension.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Your free trial draws from one shared credit pool. Each file analysis, Verify Chat run, or extension
          reveal uses one credit until you subscribe.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
          <Link
            href="/#pricing"
            onClick={() => onOpenChange(false)}
            className={cn(buttonVariants({ variant: 'primary', size: 'default' }), 'text-center')}
          >
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
