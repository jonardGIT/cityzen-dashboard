import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
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
