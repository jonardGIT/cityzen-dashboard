import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: [
    "https://xypes-cirs-dashboard.vercel.app",
    // Local/dev origins can remain if you want to support local development:
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3001",
    "http://192.168.0.131",
    "https://192.168.0.131",
    "http://192.168.0.131:3001",
    "http://192.168.0.131:5173",
  ],
};

export default nextConfig;