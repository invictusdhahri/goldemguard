'use client';

import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';

type CalloutType = 'info' | 'tip' | 'warning' | 'success';

const CALLOUT_CONFIG: Record<
  CalloutType,
  { icon: any; colorClass: string; iconClass: string; title: string }
> = {
  info: {
    icon: Info,
    colorClass: 'border-cyan/20 bg-cyan/5',
    iconClass: 'text-cyan',
    title: 'Note',
  },
  tip: {
    icon: Lightbulb,
    colorClass: 'border-purple/20 bg-purple/5',
    iconClass: 'text-purple',
    title: 'Tip',
  },
  warning: {
    icon: AlertCircle,
    colorClass: 'border-amber-500/20 bg-amber-500/5',
    iconClass: 'text-amber-500',
    title: 'Warning',
  },
  success: {
    icon: CheckCircle2,
    colorClass: 'border-emerald-500/20 bg-emerald-500/5',
    iconClass: 'text-emerald-500',
    title: 'Success',
  },
};

export function DocCallout({
  type = 'info',
  children,
  className,
}: {
  type?: CalloutType;
  children: ReactNode;
  className?: string;
}) {
  const config = CALLOUT_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative my-6 overflow-hidden rounded-xl border p-4 backdrop-blur-md',
        config.colorClass,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', config.iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className={cn('mb-1 text-xs font-bold uppercase tracking-wider', config.iconClass)}>
            {config.title}
          </p>
          <div className="text-[14px] leading-relaxed text-slate-300">{children}</div>
        </div>
      </div>
    </div>
  );
}
