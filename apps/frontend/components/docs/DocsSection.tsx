import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function DocsSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn('scroll-mt-28 border-b border-border/60 pb-16 pt-4 last:border-0 md:scroll-mt-24', className)}
    >
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}
