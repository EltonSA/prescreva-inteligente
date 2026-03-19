/** @type {import('next').NextConfig} */
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
    ],
  },
}

module.exports = nextConfig
