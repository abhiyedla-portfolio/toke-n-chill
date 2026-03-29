/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
