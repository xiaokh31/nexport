import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/env/public";
import { listPublishedArticleSitemapEntries } from "@/lib/articles/public-service";
import { prisma } from "@/lib/prisma";
import { buildPublicSitemap } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listPublishedArticleSitemapEntries(prisma);
  return buildPublicSitemap(publicEnv.siteUrl, articles);
}
