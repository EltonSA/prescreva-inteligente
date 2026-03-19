/** @type {import('next').NextConfig} */

const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:3333'

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'prescrevainteligente.com.br',
      },
      {
        protocol: 'https',
        hostname: '*.prescrevainteligente.com.br',
      },
      {
        protocol: 'https',
        hostname: '*.besteweb.com.br',
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/proxy/:path*',
          destination: `${API_INTERNAL}/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    }
  },
}

module.exports = nextConfig
