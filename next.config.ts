import { withNextVideo } from "next-video/process";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/a4f.png',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
      },
      {
        protocol: 'https',
        hostname: 'user-images.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.worldvectorlogo.com',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
    ],
  },
};

export default withNextVideo(nextConfig);