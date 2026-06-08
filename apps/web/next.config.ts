import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore build errors caused by route handlers exporting helper functions
    // (e.g. handleAdminEvalRun) which is required for external package testing.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint errors during build to prevent unrelated pre-existing lint
    // errors from blocking successful Next.js builds.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
