import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("SEO-001 source boundaries", () => {
  it("renders the news list and detail from published server data", () => {
    const list = source("src/app/news/page.tsx");
    const detail = source("src/app/news/[slug]/page.tsx");
    const publicService = source("src/lib/articles/public-service.ts");

    expect(list).not.toContain('"use client"');
    expect(list).not.toContain("useEffect");
    expect(list).not.toContain("fetch(");
    expect(list).toContain("listPublishedArticles");
    expect(list).toContain("<Link rel=\"next\"");
    expect(detail).not.toContain('"use client"');
    expect(detail).toContain("getPublishedArticleBySlug");
    expect(publicService).toContain('status: "PUBLISHED"');
    expect(publicService).toContain("publishedAt: { not: null }");
  });

  it("adds canonical Article metadata and safe JSON-LD", () => {
    const detail = source("src/app/news/[slug]/page.tsx");
    const structuredData = source("src/lib/seo/structured-data.ts");

    expect(detail).toContain("export async function generateMetadata");
    expect(detail).toContain("alternates: { canonical: url }");
    expect(detail).toContain('type: "article"');
    expect(detail).toContain("<ArticleSchema");
    expect(structuredData).toContain('"@type": "Article"');
    expect(structuredData).not.toContain('"@type": "LocalBusiness"');
  });

  it("builds the sitemap from real published Article timestamps", () => {
    const route = source("src/app/sitemap.ts");
    const builder = source("src/lib/seo/sitemap.ts");

    expect(route).toContain("export default async function sitemap");
    expect(route).toContain("listPublishedArticleSitemapEntries");
    expect(builder).toContain("lastModified: article.updatedAt");
    expect(builder).not.toContain("new Date()");
  });

  it("removes fake locale alternates and placeholder enterprise schemas", () => {
    const rootLayout = source("src/app/layout.tsx");
    const components = source("src/components/seo/structured-data.tsx");

    expect(rootLayout).not.toContain("languages:");
    expect(rootLayout).not.toContain("alternateLocale");
    expect(rootLayout).not.toMatch(/\/(?:zh|en|fr)["'`]/);
    expect(rootLayout).not.toContain("LocalBusinessSchema");
    expect(rootLayout).not.toContain("OrganizationSchema");
    expect(components).not.toContain("Company Name");
    expect(components).not.toContain("contact@example.com");
  });

  it("gives every solution a canonical, breadcrumbs, Service facts, and related articles", () => {
    const solutionLayout = source("src/app/solutions/[slug]/layout.tsx");

    expect(solutionLayout).toContain("export async function generateMetadata");
    expect(solutionLayout).toContain("alternates: { canonical }");
    expect(solutionLayout).toContain("<BreadcrumbSchema");
    expect(solutionLayout).toContain("<ServiceSchema");
    expect(solutionLayout).toContain('context="related"');
    expect(solutionLayout).not.toContain("providerName=");
    expect(solutionLayout).not.toContain("areaServed=");
  });

  it("links latest published articles from the home page and blocks private routes", () => {
    const home = source("src/app/page.tsx");
    const robots = source("src/app/robots.ts");

    expect(home).toContain("listPublishedArticles");
    expect(home).toContain('context="home"');
    for (const route of ["/api/", "/admin/", "/user/", "/dashboard/", "/login", "/register", "/verify-email"]) {
      expect(robots, route).toContain(`"${route}"`);
    }
    expect(robots).toContain('userAgent: "*"');
  });
});
