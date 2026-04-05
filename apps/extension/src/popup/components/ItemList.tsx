import React from 'react';
import { RefreshCw, AlertCircle, Loader2, ScanLine } from 'lucide-react';
import type { ScrapedItem, RevealResult } from '../../types';
import { ItemCard } from './ItemCard';

interface Props {
  items: ScrapedItem[];
  reveals: Record<string, RevealResult>;
  scraping: boolean;
  scrapeError: string | null;
  onReveal: (item: ScrapedItem) => void;
  onRescrape: () => void;
}

export function ItemList({ items, reveals, scraping, scrapeError, onReveal, onRescrape }: Props) {
  if (scraping) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <ScanLine size={22} style={{ color: '#00d4ff' }} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Scanning page…</p>
          <p className="text-xs mt-1" style={{ color: '#64748b' }}>Detecting media and posts</p>
        </div>
      </div>
    );
  }

  if (scrapeError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
        <AlertCircle size={28} style={{ color: '#f43f5e' }} />
        <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Could not scan page</p>
        <p className="text-xs" style={{ color: '#64748b' }}>{scrapeError}</p>
        <button
          type="button"
          onClick={onRescrape}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          <RefreshCw size={12} />
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <ScanLine size={22} style={{ color: '#64748b' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Nothing detected</p>
        <p className="text-xs" style={{ color: '#64748b' }}>No posts, images, or videos were found on this page.</p>
        <button
          type="button"
          onClick={onRescrape}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
        >
          <RefreshCw size={12} />
          Re-scan
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#64748b' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} detected
        </p>
        <button
          type="button"
          onClick={onRescrape}
          className="flex items-center gap-1 text-[10px] font-semibold transition-colors"
          style={{ color: '#64748b' }}
          title="Re-scan page"
        >
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          reveal={reveals[item.id]}
          onReveal={onReveal}
        />
      ))}
    </div>
  );
}
