import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** This file lives in `apps/frontend`; monorepo root is two levels up (where pnpm hoists tooling). */
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(frontendDir, "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // pnpm workspace: Turbopack must resolve `next` from the repo root, not `app/` (see Next 16 monorepo note).
    root: monorepoRoot,
  },
  // Suppress hydration warnings caused by browser extensions
  // These warnings are harmless - caused by extensions like password managers
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
