import { describe, expect, it } from "vitest";
import {
  articleCreateSchema,
  articleUpdateSchema,
  pageCreateSchema,
} from "../../src/lib/content/validation";
import { MARKDOWN_MAX_LENGTH } from "../../src/lib/content/markdown-policy";

describe("content write validation", () => {
  it("accepts bounded Markdown Article content", () => {
    expect(articleCreateSchema.safeParse({
      title: "Safe article",
      slug: "safe-article",
      excerpt: "A safe summary",
      content: "# Heading\n\nA [safe link](/privacy) and ![safe image](/images/safe.png).",
      coverImage: "/images/cover.png",
      status: "DRAFT",
    }).success).toBe(true);
  });

  it.each([
    "<script>alert(1)</script>",
    '<img src="x" onerror="alert(1)">',
    "[bad](javascript:alert(1))",
    "![bad](data:image/svg+xml,<svg/onload=alert(1)>)",
  ])("rejects unsafe Article Markdown: %s", (content) => {
    expect(articleCreateSchema.safeParse({ title: "Unsafe", content }).success).toBe(false);
  });

  it("enforces content and metadata length limits", () => {
    expect(articleCreateSchema.safeParse({
      title: "x".repeat(201),
      content: "x".repeat(MARKDOWN_MAX_LENGTH + 1),
    }).success).toBe(false);
  });

  it("rejects empty Article patches", () => {
    expect(articleUpdateSchema.safeParse({ id: "article-id" }).success).toBe(false);
  });

  it("applies the Markdown policy to every Page locale", () => {
    expect(pageCreateSchema.safeParse({
      slug: "privacy",
      title: "Privacy",
      content: "# Safe primary content",
      contentEn: "<iframe src='https://attacker.example'></iframe>",
    }).success).toBe(false);
  });
});
