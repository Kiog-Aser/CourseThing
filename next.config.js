/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  eslint: {
    // Ignore ESLint errors during production builds (Vercel / next build)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are type errors.
    // Run `npm run check` in CI to enforce strictness separately if desired.
    ignoreBuildErrors: true,
  },
  images: {
    // Allow Vercel Blob storage URLs for course posters
    domains: ['*.vercel-blob.com', '*.vercel.app'],
    // Also allow any HTTPS images (more permissive for development)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default config;
