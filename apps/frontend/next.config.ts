import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** `apps/frontend` — directory containing this config. */
const frontendDir = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (`clawy/`) — where pnpm hoists `node_modules/next`. */
const monorepoRoot = path.resolve(frontendDir, "..", "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    // Must match where `next/package.json` resolves with pnpm (usually repo root, not `apps/frontend/`).
    // If `root` is only `apps/frontend`, Turbopack often cannot see hoisted `next` and errors on `./app`.
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
