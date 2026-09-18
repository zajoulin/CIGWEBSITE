/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The content layer is plain data and the 3D model is generated in code, so
  // there is nothing to transpile from node_modules and no image pipeline.
  experimental: {},
};

export default nextConfig;
