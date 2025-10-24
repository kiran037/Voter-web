import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  output: "standalone",          // optional, helps on many hosts
  reactStrictMode: true,         // optional
};

export default nextConfig;
