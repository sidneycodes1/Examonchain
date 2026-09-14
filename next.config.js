/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'node-fetch-native': false,
      'ofetch': false,
      '@farcaster/mini-app-solana': false,
      '@stripe/crypto': false,
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "@privy-io/react-auth", "viem", "ox"],
  },
};
module.exports = nextConfig;
