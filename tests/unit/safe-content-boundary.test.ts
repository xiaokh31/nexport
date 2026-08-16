import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("safe content source boundaries", () => {
  it("routes every public and preview surface through the shared renderer", () => {
    const renderer = source("src/components/content/safe-markdown.tsx");
    const consumers = [
      "src/app/news/[slug]/page.tsx",
      "src/app/privacy/page.tsx",
      "src/app/terms/page.tsx",
      "src/app/admin/pages/page.tsx",
      "src/components/admin/article-editor-form.tsx",
      "src/app/admin/articles/[id]/preview/page.tsx",
    ];

    expect(renderer).toContain("skipHtml");
    expect(renderer).toContain("allowedElements={allowedMarkdownElements}");
    expect(renderer).toContain("urlTransform={markdownUrlTransform}");
    expect(renderer).toContain("overflow-x-auto");
    expect(renderer).not.toContain("rehypeRaw");
    for (const file of consumers) {
      expect(source(file), file).toMatch(/Markdown(?:Renderer|Preview)/);
      expect(source(file), file).not.toContain("dangerouslySetInnerHTML");
    }
  });

  it("keeps the news detail on the server content path", () => {
    const articlePage = source("src/app/news/[slug]/page.tsx");
    const publicService = source("src/lib/articles/public-service.ts");

    expect(articlePage).not.toContain('"use client"');
    expect(articlePage).toContain("getPublishedArticleBySlug");
    expect(publicService).toContain('status: "PUBLISHED"');
    expect(publicService).toContain("publishedAt: { not: null }");
  });

  it("protects saved Article previews on the server", () => {
    const preview = source("src/app/admin/articles/[id]/preview/page.tsx");

    expect(preview).toContain("currentSessionActor()");
    expect(preview).toContain('hasCapability(actor, "articles.manage")');
    expect(preview).toContain("MarkdownRenderer");
    expect(preview).toContain("index: false");
  });

  it("validates Article and Page writes with the shared Zod policy", () => {
    for (const file of [
      "src/app/api/admin/articles/route.ts",
      "src/app/api/admin/pages/route.ts",
      "src/app/api/admin/pages/[id]/route.ts",
    ]) {
      const route = source(file);
      expect(route, file).toMatch(/(?:article|page)(?:Create|Update)Schema\.parse/);
      expect(route, file).toContain("ZodError");
    }
  });

  it("sets a CSP and modern headers without the obsolete XSS header", () => {
    const config = source("next.config.ts");

    expect(config).toContain("Content-Security-Policy");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("Permissions-Policy");
    expect(config).not.toContain("X-XSS-Protection");
  });

  it("escapes structured data before using its intentional JSON script sink", () => {
    const structuredData = source("src/components/seo/structured-data.tsx");

    expect(structuredData).toContain("serializeStructuredData(value)");
    expect(structuredData).not.toContain("__html: JSON.stringify(value)");
  });
});
