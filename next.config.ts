// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 15+: this replaces experimental.serverComponentsExternalPackages
  serverExternalPackages: ["xlsx"],
};

export default nextConfig;
