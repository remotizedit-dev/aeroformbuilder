import type { NextConfig } from "next";

import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Turbopack configuration is required even in production (empty object) if webpack config exists
  turbopack: isDev ? {
    resolveAlias: {
      "firebase/firestore": "firebase/firestore/dist/esm/index.esm.js",
      "@firebase/firestore": "@firebase/firestore/dist/index.esm.js",
    },
  } : {},
  webpack: (config, { isServer }) => {
    // Only alias on the server in development to bypass Next.js dev-server gRPC conflicts.
    // In production (Vercel), let it use standard CommonJS/Node gRPC which works natively.
    if (isServer && isDev) {
      config.resolve.alias["firebase/firestore"] = path.resolve(
        __dirname,
        "node_modules/firebase/firestore/dist/esm/index.esm.js"
      );
      config.resolve.alias["@firebase/firestore"] = path.resolve(
        __dirname,
        "node_modules/@firebase/firestore/dist/index.esm.js"
      );
    }
    return config;
  },
};

export default nextConfig;
