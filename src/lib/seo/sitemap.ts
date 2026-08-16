import type { MetadataRoute } from "next";
import { solutionConfigs } from "@/config/site-config";

export function buildPublicSitemap(
  siteUrl: string,
  articles: Array<{ slug: string; updatedAt: Date }>,
): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, siteUrl).toString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/solutions"), changeFrequency: "monthly", priority: 0.9 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/contact"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/news"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];
  const solutionPages: MetadataRoute.Sitemap = solutionConfigs.map(({ slug }) => ({
    url: url(`/solutions/${slug}`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: url(`/news/${encodeURIComponent(article.slug)}`),
    lastModified: article.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...solutionPages, ...articlePages];
}
