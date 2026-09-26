import type { NextConfig } from "next";
import { EventEmitter } from "node:events";

// Increase listener limit to prevent benign Gzip drain warning during concurrent dev chunks
EventEmitter.defaultMaxListeners = 25;

const nextConfig: NextConfig = {
  // Disable dev-mode Gzip compression on localhost to avoid stream listener accumulation
  compress: process.env.NODE_ENV === "production",
  async rewrites() {
    return [
      {
        source: "/@:author/:permlink",
        destination: "/post/:author/:permlink",
      },
      {
        source: "/@:username",
        destination: "/user/:username",
      },
    ];
  },
};

export default nextConfig;
