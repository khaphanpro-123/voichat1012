/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },

  // Cache static assets aggressively, no-cache for API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // Compress responses
  compress: true,

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
