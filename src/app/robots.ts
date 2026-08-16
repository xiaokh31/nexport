import { MetadataRoute } from "next";
import { publicEnv } from "@/config/env/public";

const siteUrl = publicEnv.siteUrl;

export default function robots(): MetadataRoute.Robots {
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
