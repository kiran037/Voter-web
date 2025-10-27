// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"], 
  reactStrictMode: true,
};

export default nextConfig;
