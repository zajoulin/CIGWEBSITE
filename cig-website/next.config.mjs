/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export: `next build` writes a plain HTML site to ./out,
  // which Cloudflare serves directly via wrangler's assets feature.
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {},
};

export default nextConfig;
