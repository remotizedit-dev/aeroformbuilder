import type { NextConfig } from "next";

import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  transpilePackages: ["firebase", "@firebase/firestore"],
  turbopack: {
    resolveAlias: {
      "firebase/firestore": "firebase/firestore/dist/esm/index.esm.js",
      "@firebase/firestore": "@firebase/firestore/dist/index.esm.js",
    },
  },
  webpack: (config, { isServer }) => {
    // Force both dev and prod server-side environments to alias firestore to its ESM browser build.
    // This forces Firestore to use HTTP fetch (long-polling) which is compatible with both Next.js dev server and Vercel serverless functions.
    if (isServer) {
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
