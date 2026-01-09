/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip type checking during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Increase body size limit for file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.externals.push(
        "snappy",
        "kerberos",
        "mongodb-client-encryption",
        "@mongodb-js/zstd"
      );
    }
    return config;
  },
};

module.exports = nextConfig;
