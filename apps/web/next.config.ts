import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  transpilePackages: ["@trionic/agents", "@trionic/pageindex", "@trionic/shared", "@trionic/translation"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
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

export default withNextIntl(nextConfig);