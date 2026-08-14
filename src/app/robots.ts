import { MetadataRoute } from "next";
import { publicEnv } from "@/config/env/public";

const siteUrl = publicEnv.siteUrl;

/**
 * 生成robots.txt配置
 * 
 * 支持的搜索引擎:
 * - Google (Googlebot)
 * - Bing (Bingbot)
 * - 百度 (Baiduspider)
 * - 其他搜索引擎 (*)
 */
export default function robots(): MetadataRoute.Robots {
  // 公共禁止爬取的路径
  const disallowedPaths = [
    "/api/",
    "/admin/",
    "/user/",
    "/dashboard/",
    "/login",
    "/register",
    "/_next/",
    "/private/",
  ];

  return {
    rules: [
      // 默认规则 - 所有搜索引擎
      {
        userAgent: "*",
        allow: "/",
        disallow: disallowedPaths,
      },
      // Google 特定规则
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/user/", "/dashboard/"],
      },
      // Bing 特定规则
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/user/", "/dashboard/"],
      },
      // 百度特定规则
      {
        userAgent: "Baiduspider",
        allow: "/",
        disallow: ["/api/", "/admin/", "/user/", "/dashboard/"],
      },
      // 百度图片爬虫
      {
        userAgent: "Baiduspider-image",
        allow: "/images/",
        disallow: ["/api/", "/admin/", "/user/"],
      },
      // Yandex (俄罗斯搜索引擎)
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/api/", "/admin/", "/user/", "/dashboard/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
