/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["child_process"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  // Increased timeout for static generation to prevent build failures on slower machines
  staticPageGenerationTimeout: 300,
};

module.exports = nextConfig;
