/**
 * FFmpeg-based video utilities for the analysis pipeline.
 *
 * All functions work entirely in-memory via temp files:
 *   1. Write input buffer to a temp file
 *   2. Run ffmpeg/ffprobe
 *   3. Read output back into a Buffer
 *   4. Clean up temp files
 *
 * Requires `ffmpeg` and `ffprobe` to be installed in $PATH (or set via
 * FFMPEG_PATH / FFPROBE_PATH env vars).
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Allow overriding binary paths via env (useful in Docker)
if (process.env.FFMPEG_PATH)  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);

/** Thrown when ffmpeg/ffprobe binaries are not found in $PATH. */
export class FfmpegNotFoundError extends Error {
  constructor() {
    super(
      'ffmpeg/ffprobe not found. Install it: macOS → `brew install ffmpeg`  |  Ubuntu/Debian → `apt-get install -y ffmpeg`  |  Docker → add `RUN apt-get install -y ffmpeg` to Dockerfile. ' +
      'Or set FFMPEG_PATH and FFPROBE_PATH env vars to the binary locations.',
    );
    this.name = 'FfmpegNotFoundError';
  }
}

function isMissingBinary(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes('cannot find ffprobe') ||
    msg.includes('cannot find ffmpeg') ||
    msg.includes('enoent') ||
    msg.includes('no such file') ||
    msg.includes('not found')
  );
}

function wrapFfmpegError(err: Error): Error {
  if (isMissingBinary(err)) return new FfmpegNotFoundError();
  return err;
}

async function writeTempFile(buffer: Buffer, ext: string): Promise<string> {
  const p = path.join(os.tmpdir(), `veritas_${randomUUID()}${ext}`);
  await fs.writeFile(p, buffer);
  return p;
}

async function removeSafe(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => undefined);
}

// ─── Duration ─────────────────────────────────────────────────────────────────

/**
 * Return the duration of a video (in seconds) using ffprobe.
 * Throws if ffprobe cannot read the file.
 */
export function getVideoDuration(buffer: Buffer): Promise<number> {
  return new Promise(async (resolve, reject) => {
    const inputPath = await writeTempFile(buffer, '.mp4');
    ffmpeg.ffprobe(inputPath, async (err, meta) => {
      await removeSafe(inputPath);
      if (err) {
        reject(wrapFfmpegError(new Error(`ffprobe failed: ${err.message}`)));
        return;
      }
      const duration = meta?.format?.duration;
      if (typeof duration !== 'number' || !Number.isFinite(duration)) {
        reject(new Error('ffprobe: could not read video duration'));
        return;
      }
      resolve(duration);
    });
  });
}

// ─── Audio extraction ─────────────────────────────────────────────────────────

/**
 * Extract the first `durationSec` seconds of audio from a video as a WAV buffer.
 * Returns null if the video has no audio stream (ffmpeg will error).
 */
export async function extractAudioSegment(
  buffer:      Buffer,
  durationSec: number,
): Promise<Buffer> {
  const inputPath  = await writeTempFile(buffer, '.mp4');
  const outputPath = path.join(os.tmpdir(), `veritas_audio_${randomUUID()}.wav`);

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .noVideo()
        .audioCodec('pcm_s16le')   // WAV PCM
        .audioFrequency(16000)     // 16 kHz — sufficient for voice deepfake detectors
        .audioChannels(1)          // mono
        .duration(durationSec)
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(wrapFfmpegError(new Error(`ffmpeg audio extract: ${err.message}`))))
        .run();
    });

    return await fs.readFile(outputPath);
  } finally {
    await removeSafe(inputPath);
    await removeSafe(outputPath);
  }
}

// ─── Frame extraction ─────────────────────────────────────────────────────────

/**
 * Extract `count` evenly-spaced frames from a video as JPEG buffers.
 * The frames are returned in chronological order.
 *
 * @param buffer  - Raw video bytes
 * @param count   - Number of frames to extract (e.g. 3)
 * @param duration - Pre-fetched duration in seconds (avoids a second ffprobe call)
 */
export async function extractKeyFrames(
  buffer:    Buffer,
  count:     number,
  duration?: number,
): Promise<Buffer[]> {
  const inputPath = await writeTempFile(buffer, '.mp4');
  const outDir    = path.join(os.tmpdir(), `veritas_frames_${randomUUID()}`);

  try {
    await fs.mkdir(outDir, { recursive: true });

    // Resolve actual duration if not supplied
    const dur = duration ?? await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, meta) => {
        if (err) { reject(wrapFfmpegError(new Error(`ffprobe failed: ${err.message}`))); return; }
        const d = meta?.format?.duration;
        if (typeof d !== 'number' || !Number.isFinite(d)) {
          reject(new Error('ffprobe: could not read video duration'));
          return;
        }
        resolve(d);
      });
    });

    // Select timestamps evenly: e.g. for count=3 and dur=9s → 1.5s, 4.5s, 7.5s
    const interval = dur / count;
    const timestamps = Array.from({ length: count }, (_, i) =>
      Math.min((i + 0.5) * interval, dur - 0.1),
    );

    // Extract each frame sequentially (avoids interleaved ffmpeg processes)
    const framePaths: string[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const framePath = path.join(outDir, `frame_${i}.jpg`);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .seekInput(timestamps[i])
          .frames(1)
          .outputOptions('-vf', 'scale=1280:-1')   // cap width at 1280px for API limits
          .output(framePath)
          .on('end', () => resolve())
          .on('error', (err) => reject(wrapFfmpegError(new Error(`ffmpeg frame extract [${i}]: ${err.message}`))))
          .run();
      });
      framePaths.push(framePath);
    }

    // Read all frames into memory
    return await Promise.all(framePaths.map((p) => fs.readFile(p)));
  } finally {
    await removeSafe(inputPath);
    // Remove each frame file and the temp dir
    const entries = await fs.readdir(outDir).catch(() => [] as string[]);
    await Promise.all(entries.map((e) => removeSafe(path.join(outDir, e))));
    await fs.rmdir(outDir).catch(() => undefined);
  }
}
