import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Turbopack is the default in Next.js 16. We need to explicitly configure it or disable it.
  // Serwist injects a webpack config. We provide an empty turbopack config to explicitly accept turbopack despite webpack config injection,
  // as suggested by the Next.js CLI tip.
  turbopack: {},
};

export default withSerwist(nextConfig);
