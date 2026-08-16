import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: this app deploys to GitHub Pages, which serves plain
  // files with no Node server. See apps/platform for the server-rendered app.
  output: "export",
  // Served at the apex https://open-vis-framework.github.io (an org/user
  // Pages site), not under a /repo-name/ subpath, so no basePath needed.
  trailingSlash: true,
  images: {
    // next/image's optimization API needs a server; unavailable in a
    // static export.
    unoptimized: true,
  },
};

export default nextConfig;
