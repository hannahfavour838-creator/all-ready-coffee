import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // PGlite ships a WASM build of PostgreSQL; keep it (and the pg driver) out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1",
  },
  experimental: {
    serverActions: { bodySizeLimit: "3mb" },
    optimizePackageImports: ["lucide-react", "recharts", "@react-three/drei"],
  },
  transpilePackages: ["three"],
  eslint: { dirs: ["src", "scripts", "tests"] },
};

export default nextConfig;
