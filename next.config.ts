import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build cache configuration for faster deployments
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Experimental features for better Edge Runtime support
  experimental: {
    // Optimize middleware execution
    optimizePackageImports: ["@supabase/ssr"],
  },

  // TypeScript and code quality
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
};

export default nextConfig;
