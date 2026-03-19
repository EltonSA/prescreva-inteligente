/** @type {import('next').NextConfig} */

const API_INTERNAL = process.env.API_INTERNAL_URL || 'http://localhost:3333'

const apiPaths = [
  '/auth/:path*',
  '/users/:path*',
  '/patients/:path*',
  '/ativos/:path*',
  '/formulas/:path*',
  '/formula-groups/:path*',
  '/ai/:path*',
  '/conversations/:path*',
  '/health',
  '/uploads/:path*',
]

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
    return apiPaths.map((source) => ({
      source,
      destination: `${API_INTERNAL}${source}`,
    }))
  },
}

module.exports = nextConfig
