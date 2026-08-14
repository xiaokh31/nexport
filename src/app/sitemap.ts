import { MetadataRoute } from "next";
import { solutionConfigs } from "@/config/site-config";
import { publicEnv } from "@/config/env/public";

const siteUrl = publicEnv.siteUrl;

/**
 * 生成网站的XML Sitemap
 * 
 * 多语言SEO说明:
 * - 当前网站使用客户端存储(localStorage)管理语言偏好
 * - 每个页面支持中文、英文、法文三种语言
 * - 使用hreflang标签在metadata中声明多语言支持
 * - Sitemap只包含实际存在的URL
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // 主要页面
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/solutions`,
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/news`,
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // 解决方案页面 - 从 solutionConfigs 动态生成
  const solutionPages: MetadataRoute.Sitemap = solutionConfigs.map(({ slug }) => ({
    url: `${siteUrl}/solutions/${slug}`,
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...mainPages, ...solutionPages];
}
