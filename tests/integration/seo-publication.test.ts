import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  findPublishedArticleBySlug,
  listPublishedArticles,
  listPublishedArticleSitemapEntries,
} from "../../src/lib/articles/public-service";

const slugPrefix = "seo-001-";
let prisma: PrismaClient;

async function cleanup() {
  await prisma.article.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
}

async function createArticle(input: {
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  updatedAt: Date;
  category?: string;
  tags?: string[];
}) {
  return prisma.article.create({
    data: {
      title: `SEO article ${input.slug}`,
      slug: input.slug,
      excerpt: `Published boundary for ${input.slug}`,
      content: `# ${input.slug}\n\nServer-rendered SEO content.`,
      author: "SEO fixture author",
      category: input.category || "company",
      tags: input.tags || [],
      status: input.status,
      publishedAt: input.publishedAt,
      updatedAt: input.updatedAt,
    },
  });
}

beforeAll(() => {
  if (process.env.NODE_ENV !== "test" || !process.env.DATABASE_URL_TEST) {
    throw new Error("Integration tests require the guarded test database runner.");
  }
  prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });
});

beforeEach(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("SEO publication reads", () => {
  it("exposes only PUBLISHED records that have a first publication timestamp", async () => {
    const publishedAt = new Date("2026-08-15T12:00:00.000Z");
    const updatedAt = new Date("2026-08-16T12:00:00.000Z");
    await Promise.all([
      createArticle({
        slug: `${slugPrefix}draft`,
        status: "DRAFT",
        publishedAt: null,
        updatedAt,
      }),
      createArticle({
        slug: `${slugPrefix}archived`,
        status: "ARCHIVED",
        publishedAt,
        updatedAt,
      }),
      createArticle({
        slug: `${slugPrefix}invalid-published`,
        status: "PUBLISHED",
        publishedAt: null,
        updatedAt,
      }),
      createArticle({
        slug: `${slugPrefix}published`,
        status: "PUBLISHED",
        publishedAt,
        updatedAt,
        category: "service",
        tags: ["warehouse"],
      }),
    ]);

    await expect(findPublishedArticleBySlug(prisma, `${slugPrefix}draft`))
      .resolves.toBeNull();
    await expect(findPublishedArticleBySlug(prisma, `${slugPrefix}archived`))
      .resolves.toBeNull();
    await expect(findPublishedArticleBySlug(prisma, `${slugPrefix}invalid-published`))
      .resolves.toBeNull();
    await expect(findPublishedArticleBySlug(prisma, `${slugPrefix}published`))
      .resolves.toMatchObject({ slug: `${slugPrefix}published`, publishedAt });

    const list = await listPublishedArticles(prisma, { page: 1, limit: 10 });
    expect(list.articles.filter((article) => article.slug.startsWith(slugPrefix)))
      .toHaveLength(1);
    const related = await listPublishedArticles(prisma, {
      page: 1,
      limit: 3,
      category: "service",
      relatedTags: ["warehouse"],
    });
    expect(related.articles.map((article) => article.slug))
      .toContain(`${slugPrefix}published`);
  });

  it("uses persisted updatedAt values for sitemap entries", async () => {
    const updatedAt = new Date("2026-08-20T18:30:00.000Z");
    await createArticle({
      slug: `${slugPrefix}sitemap`,
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-19T12:00:00.000Z"),
      updatedAt,
    });

    const entries = await listPublishedArticleSitemapEntries(prisma);
    expect(entries).toContainEqual({ slug: `${slugPrefix}sitemap`, updatedAt });
  });
});
