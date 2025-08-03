/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'drive.google.com'],
    formats: ['image/webp', 'image/avif'],
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