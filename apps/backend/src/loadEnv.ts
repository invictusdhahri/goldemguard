/**
 * Load `apps/backend/.env` regardless of process.cwd() (Turbo / monorepo runs
 * may start from the repo root, so `dotenv/config` alone misses backend keys).
 */
import path from 'node:path';
import dotenv from 'dotenv';

// Compiled to CommonJS so `__dirname` is defined; resolves `apps/backend/.env` from `dist/`.
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
