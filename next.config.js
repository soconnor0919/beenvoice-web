/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

const isDockerBuild = process.env.DOCKER_BUILD === "1";
const disableReactCompiler = process.env.DISABLE_REACT_COMPILER === "1";

/** @type {import("next").NextConfig} */
const config = {
  // React Compiler is helpful in dev/prod but adds compile-time memory pressure in Docker builds.
  reactCompiler: !disableReactCompiler,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["pg", "better-auth"],
  experimental: {
    webpackMemoryOptimizations: true,
  },
  // Skip duplicate typecheck during Docker `next build` to lower peak memory.
  // Lint separately via `bun run lint` / `bun run check`.
  ...(isDockerBuild
    ? {
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default config;
