/**
 * POST /api/analyze/contextual
 *
 * Synchronous three-axis contextual analysis pipeline.
 * No job queue — returns results directly in the HTTP response.
 *
 * Axis 1 — AI authenticity:  SightEngine image/video genai detection
 * Axis 2 — Context match:    Grok vision + web search (image/frame vs. claim)
 * Axis 3 — Source check:     Grok web search on the provided source URL (text-only)
 *
 * Multipart form fields:
 *   media       File    optional  image or video
 *   context     string  optional  caption, headline, or claim to verify
 *   source_url  string  optional  URL to fact-check
 */

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { analyzeImage, analyzeVideo } from '../services/sightengineService';
import { callGrokContextual, type GrokContextualResult } from '../services/grokService';
import { extractKeyFrames } from '../utils/videoUtils';
import { consumeTrialCredit } from '../services/creditsService';

export const contextualRouter = Router();

// ─── Helpers shared by both endpoints ─────────────────────────────────────────

async function runAxes(
  fileBuffer: Buffer | null,
  fileMime:   string | null,
  filename:   string,
  context:    string,
  sourceUrl:  string,
): Promise<Record<string, unknown>> {
  const isImage = fileMime?.startsWith('image/') ?? false;
  const isVideo = fileMime?.startsWith('video/') ?? false;

  const axis1Promise: Promise<object | null> = (async () => {
    if (!fileBuffer || !fileMime) return null;
    try {
      if (isImage) return await analyzeImage(fileBuffer, filename);
      if (isVideo) return await analyzeVideo(fileBuffer, filename);
      return null;
    } catch (err) {
      console.error('[contextual] Axis 1 error:', (err as Error).message);
      return { error: (err as Error).message };
    }
  })();

  const axis2Promise: Promise<GrokContextualResult | { error: string } | null> = (async () => {
    if (!context) return null;
    try {
      let frameBuffer: Buffer | null = null;
      let frameMime:   string | null = null;

      if (fileBuffer && isImage) {
        frameBuffer = fileBuffer;
        frameMime   = fileMime;
      } else if (fileBuffer && isVideo) {
        const frames = await extractKeyFrames(fileBuffer, 1);
        if (frames.length > 0) { frameBuffer = frames[0]; frameMime = 'image/jpeg'; }
      }

      const outcome = await callGrokContextual(frameBuffer, frameMime, context);
      if (outcome.ok) return outcome.data;
      console.error('[contextual] Axis 2 Grok error:', outcome.reason);
      return { error: outcome.reason };
    } catch (err) {
      console.error('[contextual] Axis 2 error:', (err as Error).message);
      return { error: (err as Error).message };
    }
  })();

  const axis3Promise: Promise<GrokContextualResult | { error: string } | null> = (async () => {
    if (!sourceUrl) return null;
    try {
      const claimText = context
        ? `Source URL: ${sourceUrl}\n\nClaim associated with this source: "${context}"`
        : `Is this URL from a credible and trustworthy source? URL: ${sourceUrl}`;
      const outcome = await callGrokContextual(null, null, claimText);
      if (outcome.ok) return outcome.data;
      console.error('[contextual] Axis 3 Grok error:', outcome.reason);
      return { error: outcome.reason };
    } catch (err) {
      console.error('[contextual] Axis 3 error:', (err as Error).message);
      return { error: (err as Error).message };
    }
  })();

  const [authenticity, contextual, source] = await Promise.all([
    axis1Promise,
    axis2Promise,
    axis3Promise,
  ]);

  const response: Record<string, unknown> = {};
  if (authenticity !== null) response.authenticity = authenticity;
  if (contextual   !== null) response.contextual   = contextual;
  if (source       !== null) response.source        = source;
  return response;
}

// ─── POST / — accepts multipart file upload ───────────────────────────────────

contextualRouter.post(
  '/',
  requireAuth,
  upload.single('media'),
  async (req: AuthRequest, res) => {
    const credit = await consumeTrialCredit(req.userId!);
    if (!credit.ok) {
      res.status(402).json({
        error: 'Trial credits exhausted. Upgrade to continue.',
        code: 'INSUFFICIENT_CREDITS',
        remaining: credit.remaining,
      });
      return;
    }

    const context:   string = typeof req.body.context    === 'string' ? req.body.context.trim()    : '';
    const sourceUrl: string = typeof req.body.source_url === 'string' ? req.body.source_url.trim() : '';
    const file = req.file;

    const result = await runAxes(
      file?.buffer ?? null,
      file?.mimetype ?? null,
      file?.originalname ?? 'upload',
      context,
      sourceUrl,
    );

    res.json({ ...result, remaining: credit.remaining });
  },
);

// ─── POST /url — accepts a JSON media_url instead of a file upload ────────────
// Used by the browser extension where cross-origin file upload is not practical.

const ALLOWED_MEDIA_MIMES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif',  webp: 'image/webp',
  mp4: 'video/mp4',  mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo',
};

function guessMimeFromUrl(url: string): string | null {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? '';
    return ALLOWED_MEDIA_MIMES[ext] ?? null;
  } catch {
    return null;
  }
}

contextualRouter.post('/url', requireAuth, async (req: AuthRequest, res) => {
  const credit = await consumeTrialCredit(req.userId!);
  if (!credit.ok) {
    res.status(402).json({
      error: 'Trial credits exhausted. Upgrade to continue.',
      code: 'INSUFFICIENT_CREDITS',
      remaining: credit.remaining,
    });
    return;
  }

  const mediaUrl: string  = typeof req.body.media_url  === 'string' ? req.body.media_url.trim()  : '';
  const context:  string  = typeof req.body.context    === 'string' ? req.body.context.trim()    : '';
  const sourceUrl: string = typeof req.body.source_url === 'string' ? req.body.source_url.trim() : '';

  let fileBuffer: Buffer | null = null;
  let fileMime:   string | null = null;

  if (mediaUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);

      const fetchRes = await fetch(mediaUrl, {
        headers: { 'User-Agent': 'GolemGuard/1.0' },
        signal:  controller.signal,
      });
      clearTimeout(timer);

      if (!fetchRes.ok) {
        console.warn(`[contextual/url] Failed to fetch media (${fetchRes.status}): ${mediaUrl.slice(0, 80)}`);
      } else {
        const arrayBuf = await fetchRes.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
        fileMime   =
          fetchRes.headers.get('content-type')?.split(';')[0].trim() ??
          guessMimeFromUrl(mediaUrl) ??
          null;
      }
    } catch (err) {
      console.warn('[contextual/url] Media fetch error:', (err as Error).message);
      // Continue without media — Axis 2 will run text-only
    }
  }

  const filename = mediaUrl ? mediaUrl.split('/').pop()?.split('?')[0] ?? 'media' : 'media';

  const result = await runAxes(fileBuffer, fileMime, filename, context, sourceUrl);
  res.json({ ...result, remaining: credit.remaining });
});
