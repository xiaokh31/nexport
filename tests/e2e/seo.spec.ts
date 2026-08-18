import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const slugs = {
  published: "seo-001-e2e-published",
  draft: "seo-001-e2e-draft",
  archived: "seo-001-e2e-archived",
};

async function cleanup() {
  await prisma.article.deleteMany({ where: { slug: { in: Object.values(slugs) } } });
}

test.beforeEach(async () => {
  await cleanup();
  const publishedAt = new Date("2026-08-15T12:00:00.000Z");
  await prisma.article.createMany({
    data: [
      {
        title: "SEO-001 published warehouse article",
        slug: slugs.published,
        excerpt: "Published excerpt available in server HTML.",
        content: "# Server rendered body\n\nThis body must be present in the initial response.",
        seoTitle: "Published warehouse SEO title",
        seoDescription: "Published warehouse SEO description.",
        author: "SEO E2E Author",
        category: "service",
        tags: ["warehouse"],
        status: "PUBLISHED",
        publishedAt,
        updatedAt: new Date("2026-08-16T18:30:00.000Z"),
      },
      {
        title: "SEO-001 draft article",
        slug: slugs.draft,
        excerpt: "Draft excerpt must stay private.",
        content: "# Private draft",
        author: "SEO E2E Author",
        category: "company",
        tags: [],
        status: "DRAFT",
        publishedAt: null,
      },
      {
        title: "SEO-001 archived article",
        slug: slugs.archived,
        excerpt: "Archived excerpt must stay private.",
        content: "# Private archive",
        author: "SEO E2E Author",
        category: "company",
        tags: [],
        status: "ARCHIVED",
        publishedAt,
      },
    ],
  });
});

test.afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("published Article HTML includes canonical metadata and parseable JSON-LD", async ({ page, request }) => {
  const response = await page.goto(`/news/${slugs.published}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("SEO-001 published warehouse article");
  await expect(page.getByRole("heading", { level: 2, name: "Server rendered body" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new URL(`/news/${slugs.published}`, baseURL).toString(),
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex.*nofollow/,
  );

  const articleJson = JSON.parse(await page.locator("script#article-schema").textContent() || "null");
  expect(articleJson).toMatchObject({
    "@type": "Article",
    headline: "SEO-001 published warehouse article",
    datePublished: "2026-08-15T12:00:00.000Z",
    dateModified: "2026-08-16T18:30:00.000Z",
  });
  expect(JSON.stringify(articleJson)).not.toMatch(/Company Name|LocalBusiness|contact@example\.com/i);

  expect((await request.get(`/news/${slugs.draft}`)).status()).toBe(404);
  expect((await request.get(`/news/${slugs.archived}`)).status()).toBe(404);
});

test("news, home, and solution pages expose published links while non-production sitemap stays empty", async ({ page, request }) => {
  const newsHtml = await (await request.get("/news")).text();
  expect(newsHtml).toContain("SEO-001 published warehouse article");
  expect(newsHtml).toContain("Published excerpt available in server HTML.");
  expect(newsHtml).not.toContain("SEO-001 draft article");
  expect(newsHtml).not.toContain("SEO-001 archived article");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "最新行业内容" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SEO-001 published warehouse article" })).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
  const rootSchemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(rootSchemas.join("\n")).not.toMatch(/LocalBusiness|Company Name|contact@example\.com/i);

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("<urlset");
  expect(sitemap).not.toContain(`/news/${slugs.published}`);
  expect(sitemap).not.toContain(`/news/${slugs.draft}`);
  expect(sitemap).not.toContain(`/news/${slugs.archived}`);

  await page.goto("/solutions/warehouse");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new URL("/solutions/warehouse", baseURL).toString(),
  );
  await expect(page.getByRole("heading", { name: "相关文章" })).toBeVisible();
  await expect(page.getByRole("link", { name: "SEO-001 published warehouse article" })).toBeVisible();
  for (const id of ["service-schema", "breadcrumb-schema"]) {
    const schema = JSON.parse(await page.locator(`script#${id}`).textContent() || "null");
    expect(schema["@type"]).toBe(id === "service-schema" ? "Service" : "BreadcrumbList");
    expect(JSON.stringify(schema)).not.toMatch(/Company Name|example\.com|to be configured/i);
  }
});
