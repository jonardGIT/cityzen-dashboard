import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { validateDashboardProductionEnv } from "./src/lib/config/runtime-env";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

validateDashboardProductionEnv();

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  allowedDevOrigins: [
    "xypes-cirs-dashboard.vercel.app",
    "localhost",
    "127.0.0.1",
    "192.168.0.131",
    "192.168.1.99",
  ],
};

export default nextConfig;
