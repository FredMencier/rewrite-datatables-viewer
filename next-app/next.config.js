/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  // Configuration pour copier les fichiers CSV
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Copier les fichiers CSV depuis le dossier data vers public/data
    config.module.rules.push({
      test: /\.(csv)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'public/data/[name][ext]',
      },
    });
    return config;
  },
};

module.exports = nextConfig;
