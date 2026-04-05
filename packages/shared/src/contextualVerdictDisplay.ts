/**
 * Shared copy helpers for /api/analyze/contextual responses (Chat + browser extension).
 */

export interface ContextualAuthenticitySlice {
  verdict?: 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN';
  confidence?: number;
  explanation?: string;
  error?: string;
  frame_scores?: number[];
  max_score?: number;
  mean_score?: number;
  top_signals?: string[];
  caveat?: string | null;
}

export interface ContextualGrokSlice {
  consistency_score?: number;
  verdict?: 'CONSISTENT' | 'MISLEADING' | 'UNVERIFIABLE';
  explanation?: string;
  signals?: string[];
  sources?: string[];
  image_description?: string;
  error?: string;
}

/** Shape returned by POST /api/analyze/contextual */
export interface ContextualAnalysisAxes {
  authenticity?: ContextualAuthenticitySlice | null;
  contextual?: ContextualGrokSlice | null;
  source?: ContextualGrokSlice | null;
}

const SIGNAL_LABELS: Record<string, string> = {
  ai_generated_content:
    'Visual model flagged synthetic or AI-generated image patterns.',
  ai_generated_video_content:
    'Video analysis found frames with elevated AI-generation scores.',
};

function pushUnique(out: string[], line: string) {
  const t = line.trim();
  if (t && !out.includes(t)) out.push(t);
}

/**
 * Human-readable bullets explaining the headline verdict (axes combined).
 */
export function verdictReasonBullets(r: ContextualAnalysisAxes): string[] {
  const out: string[] = [];
  const auth = r.authenticity;
  const ctx = r.contextual;
  const src = r.source;

  const authIsAi = auth && !auth.error && auth.verdict === 'AI_GENERATED';
  const ctxMisleading = ctx && !ctx.error && ctx.verdict === 'MISLEADING';
  const srcBad = src && !src.error && src.verdict === 'MISLEADING';

  if (authIsAi && auth) {
    pushUnique(out, auth.explanation ?? '');
    if (auth.frame_scores && auth.frame_scores.length > 0) {
      const peak = Math.round((auth.max_score ?? 0) * 100);
      pushUnique(
        out,
        `Video: ${auth.frame_scores.length} frame(s) sampled; peak AI-generation score ${peak}%.`,
      );
    }
    for (const sig of auth.top_signals ?? []) {
      pushUnique(out, SIGNAL_LABELS[sig] ?? sig);
    }
    if (auth.caveat) pushUnique(out, auth.caveat);
    if (ctx && !ctx.error && ctx.image_description?.trim()) {
      pushUnique(out, `Scene check: ${ctx.image_description.trim()}`);
    }
    return out;
  }

  if (ctxMisleading && ctx) {
    pushUnique(out, (ctx.explanation ?? '').trim());
    for (const s of ctx.signals ?? []) pushUnique(out, s);
  }
  if (srcBad && src) {
    pushUnique(out, (src.explanation ?? '').trim());
    for (const s of src.signals ?? []) pushUnique(out, `Source: ${s}`);
  }
  if (out.length > 0) return out;

  const uncertainAuth = auth && !auth.error && auth.verdict === 'UNCERTAIN';
  const unverifiedCtx = ctx && !ctx.error && ctx.verdict === 'UNVERIFIABLE';
  const uncertainSrc = src && !src.error && src.verdict === 'UNVERIFIABLE';

  if (uncertainAuth || unverifiedCtx || uncertainSrc) {
    if (auth && !auth.error) pushUnique(out, auth.explanation ?? '');
    if (ctx && !ctx.error) pushUnique(out, (ctx.explanation ?? '').trim());
    if (src && !src.error) pushUnique(out, (src.explanation ?? '').trim());
    return out;
  }

  if (auth && !auth.error) pushUnique(out, auth.explanation ?? '');
  if (ctx && !ctx.error) {
    const ex = (ctx.explanation ?? '').trim();
    if (ctx.verdict === 'CONSISTENT') {
      pushUnique(out, ex);
      for (const s of ctx.signals ?? []) pushUnique(out, s);
    } else {
      pushUnique(out, ex);
    }
  }
  if (src && !src.error) pushUnique(out, (src.explanation ?? '').trim());

  return out;
}

export interface VerdictResourceLink {
  href: string;
  label: string;
}

function pushLink(
  out: VerdictResourceLink[],
  seen: Set<string>,
  href: string,
  label: string,
) {
  if (seen.has(href)) return;
  seen.add(href);
  out.push({ href, label });
}

/**
 * URLs from Grok (axes 2–3) plus a small set of curated references by verdict type.
 */
export function verdictResourceLinks(r: ContextualAnalysisAxes): VerdictResourceLink[] {
  const out: VerdictResourceLink[] = [];
  const seen = new Set<string>();
  const auth = r.authenticity;
  const ctx = r.contextual;
  const src = r.source;

  const addFromAxis = (axis: ContextualGrokSlice | undefined | null) => {
    if (!axis?.sources?.length) return;
    for (const url of axis.sources) {
      try {
        const u = new URL(url);
        pushLink(out, seen, url, u.hostname.replace(/^www\./, ''));
      } catch {
        pushLink(out, seen, url, url.slice(0, 56));
      }
    }
  };

  addFromAxis(ctx);
  addFromAxis(src);

  const authIsAi = auth && !auth.error && auth.verdict === 'AI_GENERATED';
  const ctxMisleading = ctx && !ctx.error && ctx.verdict === 'MISLEADING';
  const srcBad = src && !src.error && src.verdict === 'MISLEADING';

  if (authIsAi) {
    pushLink(
      out,
      seen,
      'https://sightengine.com/docs/ai-generated-image-detection',
      'SightEngine — AI-generated image detection',
    );
    pushLink(
      out,
      seen,
      'https://www.cisa.gov/resources-tools/resources/deepfake-media-what-you-need-know',
      'CISA — deepfakes & synthetic media',
    );
  }

  if ((ctxMisleading || srcBad) && !authIsAi) {
    pushLink(out, seen, 'https://www.factcheck.org/', 'FactCheck.org — how we fact-check');
  }

  if (
    !authIsAi &&
    !ctxMisleading &&
    !srcBad &&
    auth &&
    !auth.error &&
    auth.verdict === 'HUMAN'
  ) {
    pushLink(
      out,
      seen,
      'https://www.reuters.com/fact-check/',
      'Reuters Fact Check',
    );
  }

  return out;
}
