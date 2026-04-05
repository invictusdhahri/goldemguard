import { createHash } from 'node:crypto';

/** SHA-256 of file bytes as lowercase hex (64 chars). */
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
