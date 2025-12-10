import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/auth/:path*', // Proxy /auth Requests
        destination: 'http://localhost:3001/auth/:path*', // To Backend
      },
      {
        source: '/users/:path*', // Proxy /users Requests
        destination: 'http://localhost:3001/users/:path*', // To Backend
      },
    ];
  },
};

export default nextConfig;
