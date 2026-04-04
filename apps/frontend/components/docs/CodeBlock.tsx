'use client';

import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';

export function CodeBlock({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(code.trimEnd());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-obsidian-200/90',
        className,
      )}
    >
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-obsidian-300/80 text-slate-400 opacity-100 transition-all hover:border-cyan/30 hover:text-cyan md:opacity-0 md:group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto p-4 pr-14 text-[13px] leading-relaxed text-slate-200">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
