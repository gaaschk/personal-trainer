import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack is default in Next.js 16 — use it directly, no webpack plugins
  turbopack: {},
};

export default nextConfig;
