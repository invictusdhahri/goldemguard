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

export const contextualRouter = Router();

contextualRouter.post(
  '/',
  requireAuth,
  upload.single('media'),
  async (req: AuthRequest, res) => {
    const context: string   = typeof req.body.context    === 'string' ? req.body.context.trim()    : '';
    const sourceUrl: string = typeof req.body.source_url === 'string' ? req.body.source_url.trim() : '';
    const file              = req.file;

    const isImage = file?.mimetype.startsWith('image/') ?? false;
    const isVideo = file?.mimetype.startsWith('video/') ?? false;

    // ── Axis 1: AI authenticity detection ────────────────────────────────────

    const axis1Promise: Promise<object | null> = (async () => {
      if (!file) return null;
      try {
        if (isImage) {
          return await analyzeImage(file.buffer, file.originalname);
        }
        if (isVideo) {
          return await analyzeVideo(file.buffer, file.originalname);
        }
        return null;
      } catch (err) {
        console.error('[contextual] Axis 1 error:', (err as Error).message);
        return { error: (err as Error).message };
      }
    })();

    // ── Axis 2: Context vs. media consistency ─────────────────────────────────

    const axis2Promise: Promise<GrokContextualResult | { error: string } | null> = (async () => {
      if (!context) return null;
      try {
        let frameBuffer: Buffer | null   = null;
        let frameMime:   string | null   = null;

        if (file && isImage) {
          frameBuffer = file.buffer;
          frameMime   = file.mimetype;
        } else if (file && isVideo) {
          // Extract a single representative frame from the middle of the video
          const frames = await extractKeyFrames(file.buffer, 1);
          if (frames.length > 0) {
            frameBuffer = frames[0];
            frameMime   = 'image/jpeg';
          }
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

    // ── Axis 3: Source URL credibility ────────────────────────────────────────

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

    // ── Run all axes concurrently ─────────────────────────────────────────────

    const [authenticity, contextual, source] = await Promise.all([
      axis1Promise,
      axis2Promise,
      axis3Promise,
    ]);

    const response: Record<string, unknown> = {};

    if (authenticity !== null) response.authenticity = authenticity;
    if (contextual   !== null) response.contextual   = contextual;
    if (source       !== null) response.source        = source;

    res.json(response);
  },
);
