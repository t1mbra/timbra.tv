import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Нативный модуль canvas не бандлится Turbopack/Webpack — только runtime require */
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
