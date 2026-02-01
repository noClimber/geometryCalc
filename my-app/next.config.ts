import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Damit ignoriert Vercel ESLint-Fehler beim Build und deployt trotzdem
    ignoreDuringBuilds: true,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
