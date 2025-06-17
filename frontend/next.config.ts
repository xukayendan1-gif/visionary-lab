import type { NextConfig } from "next";

// Bundle analyzer
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Get environment variables with defaults
const rawProtocol = process.env.NEXT_PUBLIC_API_PROTOCOL || 'http';
const API_PROTOCOL = (rawProtocol === 'https' ? 'https' : 'http') as 'http' | 'https';
const API_HOSTNAME = process.env.NEXT_PUBLIC_API_HOSTNAME || 'localhost';
// Ensure port is 5 characters or less (NextJS requirement)
const API_PORT = process.env.NEXT_PUBLIC_API_PORT && process.env.NEXT_PUBLIC_API_PORT.length <= 5 
  ? process.env.NEXT_PUBLIC_API_PORT 
  : '';
// const STORAGE_ACCOUNT_NAME = process.env.NEXT_PUBLIC_STORAGE_ACCOUNT_NAME;

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  // Add allowedDevOrigins to prevent the CORS warning in development
  allowedDevOrigins: ['localhost', '127.0.0.1', '::1'],
  
  // Enable compression
  compress: true,
  
  // Optimize static generation
  trailingSlash: false,
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: API_PROTOCOL,
        hostname: API_HOSTNAME,
        port: API_PORT,
        pathname: '/api/v1/gallery/asset/**',
      }
    ],
    // Image optimization settings
    minimumCacheTTL: 86400, // 24 hours
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: '26mb', // Increased for large image uploads
    },
    // Enable modern bundling optimizations
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Webpack optimizations - using safer chunk splitting
  webpack: (config, { dev, isServer }) => {
    // Only apply optimizations to client-side builds to avoid SSR issues
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript checks during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Enhanced headers with caching and security
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
      },
      {
        // Service worker caching
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // Cache static assets
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache images with longer TTL
        source: '/api/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, s-maxage=2592000', // 1 week browser, 30 days CDN
          },
        ],
      },
      {
        // Security headers
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
