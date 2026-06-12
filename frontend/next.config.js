/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required for Docker multi-stage builds – bundles Node runtime into .next/standalone
  output: 'standalone',
};

module.exports = nextConfig;
