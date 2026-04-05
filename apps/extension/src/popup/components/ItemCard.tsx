import React from 'react';
import { ImageIcon, Video, FileText, Globe, AlertTriangle, Loader2, Eye } from 'lucide-react';
import type { ScrapedItem, RevealResult } from '../../types';
import { VerdictBadge } from './VerdictBadge';
import { deriveOverallSummary } from '../utils';

interface Props {
  item: ScrapedItem;
  reveal: RevealResult | undefined;
  onReveal: (item: ScrapedItem) => void;
}

function MediaTypeIcon({ type }: { type: ScrapedItem['mediaType'] | 'document' }) {
  if (type === 'image') return <ImageIcon size={13} style={{ color: '#00d4ff' }} />;
  if (type === 'video') return <Video size={13} style={{ color: '#8b5cf6' }} />;
  if (type === 'document') return <FileText size={13} style={{ color: '#f59e0b' }} />;
  return <Globe size={13} style={{ color: '#64748b' }} />;
}

function PlatformBadge({ platform }: { platform: ScrapedItem['platform'] }) {
  const label = platform === 'twitter' ? 'X / Twitter' : 'Web';
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
    >
      {label}
    </span>
  );
}

export function ItemCard({ item, reveal, onReveal }: Props) {
  const isLoading = reveal?.status === 'loading';
  const isDone    = reveal?.status === 'done';
  const isError   = reveal?.status === 'error';

  const overall = isDone && reveal.data ? deriveOverallSummary(reveal.data) : null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(18,18,32,0.95) 0%, rgba(13,13,26,0.98) 100%)',
        border: `1px solid ${
          overall?.headline === 'FAKE' ? 'rgba(244,63,94,0.3)'
          : overall?.headline === 'REAL' ? 'rgba(16,185,129,0.3)'
          : overall?.headline === 'UNCLEAR' ? 'rgba(245,158,11,0.3)'
          : 'rgba(255,255,255,0.07)'
        }`,
      }}
    >
      {/* Thumbnail row */}
      {item.thumbnailUrl && (
        <div className="relative w-full h-28 bg-black/40 overflow-hidden">
          <img
            src={item.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {item.mediaType === 'video' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.35)' }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(139,92,246,0.7)', backdropFilter: 'blur(4px)' }}
              >
                <Video size={16} color="white" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content row */}
      <div className="p-3 space-y-2">
        {/* Type + platform badges */}
        <div className="flex items-center gap-1.5">
          <MediaTypeIcon type={item.mediaType ?? (item.type === 'document' ? 'document' : null)} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
            {item.mediaType ?? item.type}
          </span>
          <PlatformBadge platform={item.platform} />
        </div>

        {/* Caption/text */}
        {item.text && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(226,232,240,0.8)' }}>
            {item.text}
          </p>
        )}

        {/* Verdict (after reveal) */}
        {isDone && overall && (
          <VerdictBadge headline={overall.headline} summary={overall.summary} />
        )}

        {/* Error state */}
        {isError && (
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-2 mt-1"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}
          >
            <AlertTriangle size={13} color="#f43f5e" className="mt-0.5 flex-shrink-0" />
            <p className="text-xs" style={{ color: '#fb7185' }}>{reveal?.error ?? 'Analysis failed'}</p>
          </div>
        )}

        {/* Reveal button */}
        {!isDone && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onReveal(item)}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isLoading ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.1)',
              border: '1px solid rgba(0,212,255,0.25)',
              color: '#00d4ff',
              marginTop: '4px',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin-ext" />
                Analyzing…
              </>
            ) : (
              <>
                <Eye size={13} />
                Reveal
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
