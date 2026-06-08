import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to accept requests from the local network so the
  // iPhone on the same Wi-Fi can browse http://10.x.x.x:3000 during preview.
  // No effect in production.
  allowedDevOrigins: ["10.212.134.200"],
};

export default nextConfig;
