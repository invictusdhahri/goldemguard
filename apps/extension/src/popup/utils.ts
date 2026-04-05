/**
 * Derives the top-line FAKE / REAL / UNCLEAR headline from all analysis axes.
 * Mirrors the logic in apps/frontend/app/chat/page.tsx (deriveOverallSummary).
 */

import type { AnalysisResponse, OverallSummary } from '../types';

export function deriveOverallSummary(r: AnalysisResponse): OverallSummary {
  const auth = r.authenticity;
  const ctx  = r.contextual;
  const src  = r.source;

  const authIsAi      = auth && !auth.error && auth.verdict === 'AI_GENERATED';
  const ctxMisleading = ctx  && !ctx.error  && ctx.verdict  === 'MISLEADING';
  const srcBad        = src  && !src.error  && src.verdict  === 'MISLEADING';

  if (authIsAi) {
    return {
      headline:              'FAKE',
      summary:
        'This media is flagged as likely AI-generated or synthetic. Treat it as inauthentic even if the caption sounds plausible.',
      showAiCriticalWarning: true,
      showMisleadingDetail:  false,
    };
  }

  if (ctxMisleading) {
    return {
      headline:              'FAKE',
      summary:               ctx!.explanation?.trim() || 'What is shown does not match the claim.',
      showAiCriticalWarning: false,
      showMisleadingDetail:  true,
    };
  }

  if (srcBad) {
    return {
      headline:              'FAKE',
      summary:               src!.explanation?.trim() || 'The source does not reliably support the claim.',
      showAiCriticalWarning: false,
      showMisleadingDetail:  true,
    };
  }

  const uncertainAuth  = auth && !auth.error && auth.verdict === 'UNCERTAIN';
  const unverifiedCtx  = ctx  && !ctx.error  && ctx.verdict  === 'UNVERIFIABLE';
  const uncertainSrc   = src  && !src.error  && src.verdict  === 'UNVERIFIABLE';

  if (uncertainAuth || unverifiedCtx || uncertainSrc) {
    return {
      headline:              'UNCLEAR',
      summary:               'We could not fully confirm authenticity or the facts. Do not treat this as verified.',
      showAiCriticalWarning: false,
      showMisleadingDetail:  false,
    };
  }

  const ctxConsistent = ctx && !ctx.error && ctx.verdict === 'CONSISTENT';
  const summary = ctxConsistent && ctx
    ? ctx.explanation?.trim() || 'The claim lines up with the media and available evidence.'
    : auth && !auth.error && auth.verdict === 'HUMAN'
      ? 'No strong AI-generation signal in the media.'
      : 'No major red flags from the checks we ran.';

  return {
    headline:              'REAL',
    summary,
    showAiCriticalWarning: false,
    showMisleadingDetail:  false,
  };
}
