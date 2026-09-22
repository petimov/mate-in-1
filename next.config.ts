import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-chessboard"],
  async redirects() {
    return [
      {
        source: "/pro-trenry",
        destination: "/pro-trenery",
        permanent: true,
      },
      {
        source: "/pro-trenry/:slug",
        destination: "/pro-trenery/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
