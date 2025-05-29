import type { NextConfig } from "next";

// Get environment variables with defaults
const rawProtocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
const API_PROTOCOL = (rawProtocol === 'https' ? 'https' : 'http') as 'http' | 'https';
const API_HOSTNAME = process.env.NEXT_PUBLIC_API_HOSTNAME || 'localhost';
// Ensure port is 5 characters or less (NextJS requirement)
const API_PORT = process.env.NEXT_PUBLIC_API_PORT && process.env.NEXT_PUBLIC_API_PORT.length <= 5 
  ? process.env.NEXT_PUBLIC_API_PORT 
  : '';
const STORAGE_ACCOUNT_NAME = process.env.NEXT_PUBLIC_STORAGE_ACCOUNT_NAME;

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Add allowedDevOrigins to prevent the CORS warning in development
  allowedDevOrigins: ['localhost', '127.0.0.1', '::1'],
  images: {
    remotePatterns: [
      {
        protocol: API_PROTOCOL,
        hostname: API_HOSTNAME,
        port: API_PORT,
        pathname: '/api/v1/gallery/asset/**',
      },
      {
        protocol: 'https',
        hostname: `${STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
        port: '',
        pathname: '/**',
      }
    ],
    // Optimize image handling for Azure Blob Storage 
    minimumCacheTTL: 60,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb', // Increased for large image uploads
    },
  },
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript checks during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Add CORS headers to all responses from the Next.js server
  async headers() {
    return [
      {
        // Add CORS headers to all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ];
  }
};

export default nextConfig;
