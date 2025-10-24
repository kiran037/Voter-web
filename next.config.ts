// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"], // allows bundling xlsx in server funcs
  reactStrictMode: true,
};

export default nextConfig;
