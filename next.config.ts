import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: false, // ปิดการ disable เพื่อให้สามารถทดสอบ Service Worker และ Notification ในโหมด Dev ได้
});

const nextConfig: NextConfig = {
  // We use Webpack via CLI flags (--webpack) instead of Turbopack
  // because @serwist/next requires Webpack to bundle the Service Worker.
};
export default withSerwist(nextConfig);
