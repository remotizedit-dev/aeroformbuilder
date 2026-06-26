import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "firebase/firestore": "firebase/firestore/dist/esm/index.esm.js",
      "@firebase/firestore": "@firebase/firestore/dist/index.esm.js",
    },
  },
  webpack: (config, { isServer }) => {
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
