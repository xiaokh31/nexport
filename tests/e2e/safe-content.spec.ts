import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const articleSlug = "safe-001-malicious-content";
const apiArticleSlug = "safe-001-api-article";
const apiPageSlug = "safe-001-api-page";

const hostileMarkdown = `# Safe heading

Safe paragraph and a [blocked link](javascript:alert(document.domain)).

![blocked external image](https://attacker.example/tracker.png)

<script>window.__safe001Executed = true</script>
<img src="x" onerror="window.__safe001Executed = true">
<iframe srcdoc="<script>window.__safe001Executed = true</script>"></iframe>
<style>body { display: none }</style>

| Column A | Column B |
| --- | --- |
| safe | https://example.com/a/very/long/path/that/must/not-break/the/page/layout |
`;

async function authenticate(page: Page) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for SAFE E2E tests");

  const sessionToken = await encode({
    secret,
    token: {
      id: "fixture-admin",
      sub: "fixture-admin",
      role: "ADMIN",
    },
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

test.afterEach(async () => {
  await prisma.article.deleteMany({
    where: { slug: { in: [articleSlug, apiArticleSlug] } },
  });
  await prisma.page.deleteMany({
    where: { slug: { in: ["privacy", "terms", apiPageSlug] } },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("hostile stored content cannot execute on news, privacy, or terms", async ({ page }) => {
  await prisma.article.create({
    data: {
      title: "SAFE-001 hostile article",
      slug: articleSlug,
      excerpt: "The safe excerpt remains visible.",
      content: hostileMarkdown,
      author: "Security fixture",
      category: "company",
      tags: ["security"],
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  await prisma.page.createMany({
    data: [
      {
        slug: "privacy",
        title: "Privacy fixture",
        content: hostileMarkdown,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      {
        slug: "terms",
        title: "Terms fixture",
        content: hostileMarkdown,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
    ],
  });

  await page.addInitScript(() => {
    (window as Window & { __safe001Executed?: boolean }).__safe001Executed = false;
  });

  for (const path of [`/news/${articleSlug}`, "/privacy", "/terms"]) {
    await page.goto(path);
    const content = page.locator('[data-safe-markdown="true"]');

    await expect(content).toBeVisible();
    await expect(content.getByRole("heading", { name: "Safe heading", level: 2 })).toBeVisible();
    await expect(content.locator("script, iframe, style, img")).toHaveCount(0);
    const blockedLink = content.locator("a", { hasText: "blocked link" });
    await expect(blockedLink).toHaveCount(1);
    expect(await blockedLink.getAttribute("href")).toBeNull();
    await expect(content.locator("div.overflow-x-auto > table")).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as Window & { __safe001Executed?: boolean }).__safe001Executed,
      ),
    ).toBe(false);
  }
});

test("admin content APIs reject raw HTML and unsafe destinations", async ({ page }) => {
  await authenticate(page);

  const articleResponse = await page.request.post("/api/admin/articles", {
    data: {
      title: "Unsafe article",
      slug: apiArticleSlug,
      excerpt: "Unsafe content must be rejected.",
      content: '<img src="x" onerror="alert(1)">',
      coverImage: "",
      coverImageAlt: "",
      seoTitle: "",
      seoDescription: "",
      category: "company",
      tags: ["security"],
      status: "DRAFT",
    },
  });
  expect(articleResponse.status()).toBe(400);

  const pageResponse = await page.request.post("/api/admin/pages", {
    data: {
      title: "Unsafe page",
      slug: apiPageSlug,
      content: "[bad](javascript:alert(1)) ![remote](https://attacker.example/x.png)",
      status: "DRAFT",
    },
  });
  expect(pageResponse.status()).toBe(400);

  await expect(prisma.article.count({ where: { slug: apiArticleSlug } })).resolves.toBe(0);
  await expect(prisma.page.count({ where: { slug: apiPageSlug } })).resolves.toBe(0);
});

test("responses include the content security policy without X-XSS-Protection", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("object-src 'none'");
  expect(response.headers()).not.toHaveProperty("x-xss-protection");
});
