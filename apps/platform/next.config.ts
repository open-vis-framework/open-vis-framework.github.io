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
  //
  // process.cwd(), not __dirname: `next build`/`next dev` always run
  // with cwd already set to this directory, and unlike __dirname this
  // works no matter which compiler backend loads this config file. (The
  // deploy server's old glibc can't load Next's native SWC binary and
  // falls back to a WASM one for compiling next.config.ts specifically —
  // that fallback path doesn't provide __dirname, ReferenceError at
  // build time. Docker's modern glibc masks this since the native
  // binary loads fine there. See docs/adr/0002 for the glibc backstory.)
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  images: {
    // No image-optimization server needed yet; plain <img> is fine for
    // the upload-workflow MVP. Revisit if/when `sharp` gets enabled
    // (see pnpm-workspace.yaml).
    unoptimized: true,
  },
};

export default nextConfig;
