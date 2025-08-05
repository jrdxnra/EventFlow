/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Firebase Hosting - only in production
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    trailingSlash: true,
  }),
  
  // Temporarily disable ESLint for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'drive.google.com'],
    formats: ['image/webp', 'image/avif'],
    // Disable image optimization for static export
    ...(process.env.NODE_ENV === 'production' && {
      unoptimized: true,
    }),
  },
  
  // Development experience
  reactStrictMode: true,
  experimental: {
    // Enable modern React features
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  // Better error handling
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig 