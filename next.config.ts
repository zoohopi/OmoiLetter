import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: { "/api/admin/orders/**": ["./node_modules/@sparticuz/chromium/bin/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
