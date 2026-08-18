import { MetadataRoute } from "next";
import { publicEnv } from "@/config/env/public";
import { getDeploymentPolicy } from "@/config/deployment";

const siteUrl = publicEnv.siteUrl;

export default function robots(): MetadataRoute.Robots {
  const { indexingEnabled } = getDeploymentPolicy();
  if (!indexingEnabled) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  const disallowedPaths = [
    "/api/",
    "/admin/",
    "/user/",
    "/dashboard/",
    "/login",
    "/register",
    "/verify-email",
  ];

  return {
    rules: { userAgent: "*", allow: "/", disallow: disallowedPaths },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
