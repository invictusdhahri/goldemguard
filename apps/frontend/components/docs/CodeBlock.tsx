'use client';

import { cn } from '@/lib/utils';
import { Check, Copy, Terminal } from 'lucide-react';
import { useCallback, useState } from 'react';

export function CodeBlock({ code, className, title }: { code: string; className?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(code.trimEnd());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      className={cn(
        'group relative my-6 overflow-hidden rounded-2xl border border-white/5 bg-obsidian-100/80 shadow-2xl transition-all duration-300 hover:border-white/10',
        className,
      )}
    >
      {/* macOS Header */}
      <div className="flex h-11 items-center justify-between border-b border-white/5 bg-white/5 px-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          {title && (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Terminal className="h-3.5 w-3.5" />
              <span>{title}</span>
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={copy}
          className={cn(
            'flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-200',
            copied 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="overflow-x-auto p-5 text-[13.5px] leading-relaxed text-slate-300 selection:bg-cyan/30">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
