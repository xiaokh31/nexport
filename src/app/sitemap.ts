import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env/public";
import { listPublishedArticleSitemapEntries } from "@/lib/articles/public-service";
import { prisma } from "@/lib/prisma";
import { buildPublicSitemap } from "@/lib/seo/sitemap";
import { getDeploymentPolicy } from "@/config/deployment";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!getDeploymentPolicy().indexingEnabled) return [];
  const articles = await listPublishedArticleSitemapEntries(prisma);
  return buildPublicSitemap(publicEnv.siteUrl, articles);
}
