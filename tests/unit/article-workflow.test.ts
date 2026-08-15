import { describe, expect, it } from "vitest";
import type { ArticleInputValues } from "../../src/lib/content/validation";
import {
  ArticleWorkflowError,
  normalizeArticleSlug,
  prepareArticleCreate,
  prepareArticleUpdate,
} from "../../src/lib/articles/workflow";

const input: ArticleInputValues = {
  title: "Warehouse Update",
  slug: "Warehouse Update 2026",
  excerpt: "A complete editorial summary.",
  content: "# Safe update\n\nComplete Markdown content.",
  coverImage: "",
  coverImageAlt: "",
  seoTitle: "",
  seoDescription: "",
  category: "company",
  tags: ["warehouse"],
  status: "DRAFT",
};

describe("Article publication workflow", () => {
  it("normalizes Unicode slugs into one canonical form", () => {
    expect(normalizeArticleSlug("  仓储 · Update 2026!  ")).toBe("仓储-update-2026");
    expect(normalizeArticleSlug("Ｎｅｘｐｏｒｔ　News")).toBe("nexport-news");
  });

  it("sets publishedAt only on the first publication", () => {
    const firstPublication = new Date("2026-08-15T12:00:00.000Z");
    const created = prepareArticleCreate(
      { ...input, status: "PUBLISHED" },
      firstPublication,
    );
    expect(created.publishedAt).toEqual(firstPublication);

    const republished = prepareArticleUpdate(
      { slug: created.slug, publishedAt: firstPublication },
      { ...input, slug: created.slug, status: "PUBLISHED" },
      new Date("2026-09-01T12:00:00.000Z"),
    );
    expect(republished.publishedAt).toEqual(firstPublication);
  });

  it("allows title edits without changing the persisted slug", () => {
    const publishedAt = new Date("2026-08-15T12:00:00.000Z");
    const updated = prepareArticleUpdate(
      { slug: "warehouse-update-2026", publishedAt },
      {
        ...input,
        title: "Renamed Warehouse Update",
        slug: "warehouse-update-2026",
        status: "ARCHIVED",
      },
      new Date("2026-08-16T12:00:00.000Z"),
    );

    expect(updated.title).toBe("Renamed Warehouse Update");
    expect(updated.slug).toBe("warehouse-update-2026");
    expect(updated.publishedAt).toEqual(publishedAt);
  });

  it("locks the slug forever after first publication", () => {
    expect(() => prepareArticleUpdate(
      {
        slug: "warehouse-update-2026",
        publishedAt: new Date("2026-08-15T12:00:00.000Z"),
      },
      { ...input, slug: "replacement-slug", status: "ARCHIVED" },
      new Date("2026-08-16T12:00:00.000Z"),
    )).toThrowError(ArticleWorkflowError);
  });
});
