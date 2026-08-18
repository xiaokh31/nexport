import type { NextConfig } from "next";
import { getDeploymentPolicy } from "./src/config/deployment";

const isProduction = process.env.NODE_ENV === "production";
const { indexingEnabled } = getDeploymentPolicy();

function productionHostRedirect() {
  if (!indexingEnabled || !process.env.VERCEL_PROJECT_PRODUCTION_URL) return [];
  try {
    const canonicalUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
      .trim()
      .toLowerCase();
    if (!vercelProductionHost || canonicalUrl.hostname === vercelProductionHost) {
      return [];
    }
    return [{
      source: "/:path*",
      has: [{ type: "host" as const, value: vercelProductionHost }],
      destination: `${canonicalUrl.origin}/:path*`,
      permanent: true,
    }];
  } catch {
    return [];
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://www.google.com https://www.gstatic.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.google.com https://www.gstatic.com",
  "font-src 'self' data:",
  `connect-src 'self'${isProduction ? "" : " ws: wss:"} https://www.google.com https://www.gstatic.com`,
  "frame-src https://www.google.com https://recaptcha.google.com",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
          },
          ...(!indexingEnabled
            ? [
                {
                  key: "X-Robots-Tag",
                  value: "noindex, nofollow",
                },
              ]
            : []),
          ...(isProduction
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : []),
        ],
      },
    ];
  },

  async redirects() {
    return productionHostRedirect();
  },

  ...(isProduction && {
    compress: true,
  }),
};

export default nextConfig;
