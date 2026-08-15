import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createArticle,
  updateArticle,
} from "../../src/lib/articles/service";
import { ArticleWorkflowError } from "../../src/lib/articles/workflow";
import type { ArticleInputValues } from "../../src/lib/content/validation";
import { FixedClock } from "../support/doubles";
import { fixtureUserIds } from "../fixtures/users.mjs";

const slugPrefix = "article-001-";
let prisma: PrismaClient;

const actor = {
  id: fixtureUserIds["staff-editor"],
  name: "Fixture staff-editor",
  email: "staff-editor@nexport.test",
  role: "STAFF" as const,
  canManageArticles: true,
};

function articleInput(slug: string): ArticleInputValues {
  return {
    title: "ARTICLE-001 lifecycle",
    slug,
    excerpt: "Complete ARTICLE-001 integration coverage.",
    content: "# ARTICLE-001\n\nSafe Markdown body for the publication lifecycle.",
    coverImage: "/images/news/article-001.jpg",
    coverImageAlt: "Warehouse team preparing an outbound shipment",
    seoTitle: "ARTICLE-001 lifecycle",
    seoDescription: "Article lifecycle integration coverage.",
    category: "company",
    tags: ["article", "workflow"],
    status: "DRAFT",
  };
}

async function cleanup() {
  await prisma.article.deleteMany({ where: { slug: { startsWith: slugPrefix } } });
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

describe("Article workflow persistence", () => {
  it("runs draft, publication, edit, archive, and republication with one author", async () => {
    const firstPublishedAt = new Date("2026-08-15T12:00:00.000Z");
    const draft = await createArticle(prisma, {
      actor,
      article: articleInput(`${slugPrefix}lifecycle`),
      clock: new FixedClock("2026-08-15T11:00:00.000Z"),
    });
    expect(draft).toMatchObject({
      authorId: actor.id,
      author: actor.name,
      status: "DRAFT",
      publishedAt: null,
    });

    const published = await updateArticle(prisma, {
      article: { id: draft.id, status: "PUBLISHED" },
      clock: new FixedClock(firstPublishedAt.toISOString()),
    });
    const edited = await updateArticle(prisma, {
      article: { id: draft.id, title: "ARTICLE-001 renamed after publication" },
      clock: new FixedClock("2026-08-16T12:00:00.000Z"),
    });
    await updateArticle(prisma, {
      article: { id: draft.id, status: "ARCHIVED" },
      clock: new FixedClock("2026-08-17T12:00:00.000Z"),
    });
    const republished = await updateArticle(prisma, {
      article: { id: draft.id, status: "PUBLISHED" },
      clock: new FixedClock("2026-08-18T12:00:00.000Z"),
    });

    expect(published.article.publishedAt).toEqual(firstPublishedAt);
    expect(edited.article.slug).toBe(draft.slug);
    expect(republished.article).toMatchObject({
      slug: draft.slug,
      authorId: actor.id,
      status: "PUBLISHED",
      publishedAt: firstPublishedAt,
    });
  });

  it("rejects slug conflicts and post-publication slug edits", async () => {
    const first = await createArticle(prisma, {
      actor,
      article: articleInput(`${slugPrefix}unique`),
      clock: new FixedClock("2026-08-15T10:00:00.000Z"),
    });
    await expect(createArticle(prisma, {
      actor,
      article: articleInput(`${slugPrefix}unique`),
      clock: new FixedClock("2026-08-15T10:30:00.000Z"),
    })).rejects.toMatchObject({
      code: "P2002",
    });

    await updateArticle(prisma, {
      article: { id: first.id, status: "PUBLISHED" },
      clock: new FixedClock("2026-08-15T11:00:00.000Z"),
    });
    await expect(updateArticle(prisma, {
      article: { id: first.id, slug: `${slugPrefix}replacement` },
      clock: new FixedClock("2026-08-15T11:30:00.000Z"),
    })).rejects.toBeInstanceOf(ArticleWorkflowError);
  });
});
