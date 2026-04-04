/**
 * Load `apps/backend/.env` regardless of process.cwd() (Turbo / monorepo runs
 * may start from the repo root, so `dotenv/config` alone misses backend keys).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath     = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
