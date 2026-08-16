import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker deploy: only copies the files actually needed to run (see
  // docs/adr/0003-dockerize-same-server.md). Produces `.next/standalone`
  // + a minimal `server.js`, consumed by apps/platform/Dockerfile.
  output: "standalone",
  // pnpm's content-addressable store (node_modules/.pnpm) lives at the
  // monorepo root, not inside apps/platform — without this, file tracing
  // treats apps/platform as the whole world and silently drops anything
  // resolved through the root-level store. Standard fix for
  // Turborepo+pnpm+Docker (matches Vercel's own turborepo Docker example).
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    // No image-optimization server needed yet; plain <img> is fine for
    // the upload-workflow MVP. Revisit if/when `sharp` gets enabled
    // (see pnpm-workspace.yaml).
    unoptimized: true,
  },
};

export default nextConfig;
