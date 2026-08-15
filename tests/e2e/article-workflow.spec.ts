import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const slug = "article-001-e2e-lifecycle";
const conflictingSlug = "article-001-e2e-conflict";

function articleInput(articleSlug: string) {
  return {
    title: "ARTICLE-001 browser lifecycle",
    slug: articleSlug,
    excerpt: "A complete browser-level Article workflow.",
    content: "# Safe preview heading\n\nArticle body rendered through SAFE-001.",
    coverImage: "",
    coverImageAlt: "",
    seoTitle: "ARTICLE-001 browser lifecycle",
    seoDescription: "Browser verification for the Article workflow.",
    category: "company",
    tags: ["article", "browser"],
    status: "DRAFT",
  };
}

async function authenticate(page: Page, userId: string, role: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for ARTICLE E2E tests");

  const sessionToken = await encode({
    secret,
    token: { id: userId, sub: userId, role },
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

test.beforeEach(async () => {
  await prisma.article.deleteMany({
    where: { slug: { in: [slug, conflictingSlug] } },
  });
});

test.afterAll(async () => {
  await prisma.article.deleteMany({
    where: { slug: { in: [slug, conflictingSlug] } },
  });
  await prisma.$disconnect();
});

test("authorized STAFF completes the Article lifecycle while public reads stay published-only", async ({ page }) => {
  await authenticate(page, "fixture-staff-editor", "STAFF");
  const createdResponse = await page.request.post("/api/admin/articles", {
    data: articleInput(slug),
  });
  expect(createdResponse.status()).toBe(201);
  const created = (await createdResponse.json()).article as {
    id: string;
    slug: string;
    authorId: string;
    publishedAt: string | null;
  };
  expect(created).toMatchObject({
    slug,
    authorId: "fixture-staff-editor",
    publishedAt: null,
  });

  expect((await page.request.get(`/api/articles?slug=${slug}`)).status()).toBe(404);

  const publishedResponse = await page.request.patch("/api/admin/articles", {
    data: { id: created.id, status: "PUBLISHED" },
  });
  expect(publishedResponse.status()).toBe(200);
  const firstPublishedAt = (await publishedResponse.json()).article.publishedAt as string;
  expect(firstPublishedAt).toBeTruthy();
  expect((await page.request.get(`/api/articles?slug=${slug}`)).status()).toBe(200);

  const editedResponse = await page.request.patch("/api/admin/articles", {
    data: { id: created.id, title: "Renamed published article" },
  });
  const edited = (await editedResponse.json()).article as {
    slug: string;
    publishedAt: string;
  };
  expect(editedResponse.status()).toBe(200);
  expect(edited).toEqual(expect.objectContaining({ slug, publishedAt: firstPublishedAt }));

  const lockedSlugResponse = await page.request.patch("/api/admin/articles", {
    data: { id: created.id, slug: "article-001-illegal-replacement" },
  });
  expect(lockedSlugResponse.status()).toBe(409);
  expect(await lockedSlugResponse.json()).toMatchObject({ code: "SLUG_LOCKED" });

  await page.goto(`/admin/articles/${created.id}/preview`);
  await expect(page.getByText("受保护预览")).toBeVisible();
  await expect(page.locator('[data-safe-markdown="true"]')).toContainText("Safe preview heading");

  expect((await page.request.patch("/api/admin/articles", {
    data: { id: created.id, status: "ARCHIVED" },
  })).status()).toBe(200);
  expect((await page.request.get(`/api/articles?slug=${slug}`)).status()).toBe(404);

  const republishedResponse = await page.request.patch("/api/admin/articles", {
    data: { id: created.id, status: "PUBLISHED" },
  });
  expect((await republishedResponse.json()).article.publishedAt).toBe(firstPublishedAt);

  expect((await page.request.delete(`/api/admin/articles?id=${created.id}`)).status()).toBe(200);
  const missing = await page.request.patch("/api/admin/articles", {
    data: { id: created.id, title: "Missing article" },
  });
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toMatchObject({ code: "ARTICLE_NOT_FOUND" });
});

test("write authorization and slug conflicts return distinct errors", async ({ page }) => {
  await authenticate(page, "fixture-customer", "CUSTOMER");
  for (const request of [
    page.request.post("/api/admin/articles", { data: articleInput(conflictingSlug) }),
    page.request.patch("/api/admin/articles", {
      data: { id: "missing-article", title: "Forbidden edit" },
    }),
    page.request.delete("/api/admin/articles?id=missing-article"),
  ]) {
    expect((await request).status()).toBe(403);
  }

  await authenticate(page, "fixture-admin", "ADMIN");
  expect((await page.request.post("/api/admin/articles", {
    data: articleInput(conflictingSlug),
  })).status()).toBe(201);
  const conflict = await page.request.post("/api/admin/articles", {
    data: articleInput("ARTICLE 001 E2E Conflict"),
  });
  expect(conflict.status()).toBe(409);
  expect(await conflict.json()).toMatchObject({ code: "SLUG_CONFLICT" });
});
