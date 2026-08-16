import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("ARTICLE-001 source boundaries", () => {
  it("shares one complete Article input schema across the editor and API", () => {
    const validation = source("src/lib/content/validation.ts");
    const editor = source("src/components/admin/article-editor-form.tsx");
    const route = source("src/app/api/admin/articles/route.ts");
    const service = source("src/lib/articles/service.ts");

    for (const field of [
      "title",
      "slug",
      "excerpt",
      "content",
      "coverImage",
      "coverImageAlt",
      "seoTitle",
      "seoDescription",
      "category",
      "tags",
      "status",
    ]) {
      expect(validation, field).toContain(`${field}:`);
      expect(service, field).toContain(`${field}: input.${field}`);
    }
    expect(editor).toContain("zodResolver(articleInputSchema)");
    expect(route).toContain("articleCreateSchema.parse");
    expect(route).toContain("articleUpdateSchema.parse");
  });

  it("authorizes every Article operation through articles.manage", () => {
    const collectionRoute = source("src/app/api/admin/articles/route.ts");
    const detailRoute = source("src/app/api/admin/articles/[id]/route.ts");

    expect(collectionRoute.match(/requireCapability\("articles\.manage"\)/g))
      .toHaveLength(4);
    expect(detailRoute).toContain("requireCapability('articles.manage')");
  });

  it("locks published slugs and preserves the first publication time", () => {
    const workflow = source("src/lib/articles/workflow.ts");
    const service = source("src/lib/articles/service.ts");

    expect(workflow).toContain('throw new ArticleWorkflowError("SLUG_LOCKED")');
    expect(workflow).toContain("if (currentPublishedAt) return currentPublishedAt");
    expect(service).toContain("FOR UPDATE");
    expect(service).toContain("authorId: input.actor.id");
  });

  it("keeps public reads published-only and saved previews server-protected", () => {
    const publicApi = source("src/app/api/articles/route.ts");
    const publicPage = source("src/app/news/[slug]/page.tsx");
    const publicService = source("src/lib/articles/public-service.ts");
    const preview = source("src/app/admin/articles/[id]/preview/page.tsx");

    for (const publicSource of [publicApi, publicService]) {
      expect(publicSource).toContain('status: "PUBLISHED"');
      expect(publicSource).toContain("publishedAt: { not: null }");
    }
    expect(publicPage).toContain("getPublishedArticleBySlug");
    expect(preview).toContain("currentSessionActor()");
    expect(preview).toContain('hasCapability(actor, "articles.manage")');
    expect(preview).toContain("MarkdownRenderer");
  });
});
