import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
  // Suppress hydration warnings caused by browser extensions
  // These warnings are harmless - caused by extensions like password managers
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  async redirects() {
    return [
      {
        source: '/doc',
        destination: '/docs',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
