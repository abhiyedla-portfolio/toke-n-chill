/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.clover.com',
      },
      {
        protocol: 'https',
        hostname: 'clover.com',
      },
    ],
  },
};

export default nextConfig;
