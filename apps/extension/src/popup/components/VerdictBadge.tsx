import React from 'react';
import type { OverallHeadline } from '../../types';

interface Props {
  headline: OverallHeadline;
  summary: string;
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

export function VerdictBadge({ headline, summary }: Props) {
  const cfg = CONFIG[headline];
  return (
    <div
      className="rounded-xl p-3 mt-2"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <p className="text-base font-black" style={{ color: cfg.color, fontFamily: '"Space Grotesk", sans-serif' }}>
        {cfg.label}
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(226,232,240,0.75)' }}>
        {summary}
      </p>
    </div>
  );
}
