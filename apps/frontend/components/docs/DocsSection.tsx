import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
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
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'group relative scroll-mt-28 py-10 md:scroll-mt-32',
        className,
      )}
    >
      <div className="absolute -left-4 top-10 h-8 w-1 bg-gradient-to-b from-cyan to-purple opacity-0 transition-opacity group-hover:opacity-100" />
      
      <div className="glass-card overflow-hidden rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:shadow-cyan/5 md:p-10">
        <h2 className="font-[family-name:var(--font-display)] flex items-center gap-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
          <span className="gradient-text-cyan">{title.split(' ')[0]}</span>
          <span>{title.split(' ').slice(1).join(' ')}</span>
        </h2>
        
        <div className="mt-8 space-y-6 text-[15.5px] leading-relaxed text-slate-300">
          {children}
        </div>
      </div>
    </motion.section>
  );
}
