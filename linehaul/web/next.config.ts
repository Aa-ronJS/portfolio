import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard reads live operational data; nothing here is safe to
  // pre-render at build time.
  reactStrictMode: true,
};

export default nextConfig;
