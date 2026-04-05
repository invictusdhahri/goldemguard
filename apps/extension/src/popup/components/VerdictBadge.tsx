import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { OverallHeadline } from '../../types';
import type { VerdictResourceLink } from '@veritas/shared';

interface Props {
  headline: OverallHeadline;
  summary: string;
  /** Structured reasons (shared with web Chat analysis). */
  reasons?: string[];
  resources?: VerdictResourceLink[];
}

const CONFIG: Record<OverallHeadline, { label: string; color: string; bg: string; border: string }> = {
  FAKE: {
    label:  'Fake',
    color:  '#fb7185',
    bg:     'rgba(244,63,94,0.12)',
    border: 'rgba(244,63,94,0.35)',
  },
  REAL: {
    label:  'Real',
    color:  '#34d399',
    bg:     'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.35)',
  },
  UNCLEAR: {
    label:  'Unclear',
    color:  '#fbbf24',
    bg:     'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.35)',
  },
};

export function VerdictBadge({ headline, summary, reasons = [], resources = [] }: Props) {
  const cfg = CONFIG[headline];
  return (
    <div
      className="rounded-xl p-3 mt-2 space-y-2"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <p className="text-base font-black" style={{ color: cfg.color, fontFamily: '"Space Grotesk", sans-serif' }}>
        {cfg.label}
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(226,232,240,0.75)' }}>
        {summary}
      </p>
      {reasons.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
            Why
          </p>
          <ul className="text-[10px] leading-snug space-y-1 pl-3 list-disc" style={{ color: 'rgba(226,232,240,0.82)' }}>
            {reasons.slice(0, 5).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
      {resources.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
            Resources
          </p>
          <div className="flex flex-col gap-1">
            {resources.slice(0, 6).map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-cyan hover:underline"
              >
                <ExternalLink size={9} />
                <span className="truncate">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
