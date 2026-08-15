import { describe, expect, it } from "vitest";
import {
  containsRawHtml,
  inspectMarkdown,
  isAllowedMarkdownImage,
  isAllowedMarkdownLink,
} from "../../src/lib/content/markdown-policy";

describe("Markdown content policy", () => {
  it.each([
    "<script>alert(1)</script>",
    '<img src="x" onerror="alert(1)">',
    "<iframe srcdoc='<script>alert(1)</script>'></iframe>",
    "<style>body { display: none }</style>",
    "<p>legacy HTML</p>",
  ])("rejects raw HTML: %s", (payload) => {
    expect(containsRawHtml(payload)).toBe(true);
    expect(inspectMarkdown(payload)).toContainEqual(
      expect.objectContaining({ code: "RAW_HTML" }),
    );
  });

  it("keeps CommonMark autolinks available", () => {
    expect(containsRawHtml("<https://example.com> and <editor@example.com>")).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    "javascript&#x3a;alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//attacker.example/path",
    "\\\\attacker.example\\path",
  ])("blocks unsafe link destinations: %s", (destination) => {
    expect(isAllowedMarkdownLink(destination)).toBe(false);
  });

  it.each([
    "/news/example",
    "../privacy",
    "#section",
    "https://example.com/path",
    "http://example.com/path",
    "mailto:editor@example.com",
  ])("allows approved link destinations: %s", (destination) => {
    expect(isAllowedMarkdownLink(destination)).toBe(true);
  });

  it("allows only same-origin root-relative editorial images", () => {
    expect(isAllowedMarkdownImage("/images/news/example.jpg")).toBe(true);
    expect(isAllowedMarkdownImage("https://example.com/image.jpg")).toBe(false);
    expect(isAllowedMarkdownImage("data:image/svg+xml,<svg></svg>")).toBe(false);
    expect(isAllowedMarkdownImage("//attacker.example/image.jpg")).toBe(false);
  });

  it("reports dangerous Markdown links and images", () => {
    const issues = inspectMarkdown(
      "[bad](javascript:alert(1)) ![remote](https://attacker.example/x.png)",
    );

    expect(issues.map((issue) => issue.code)).toEqual(["UNSAFE_LINK", "UNSAFE_IMAGE"]);
  });

  it("rejects dangerous reference-style link destinations", () => {
    expect(inspectMarkdown("[bad][target]\n\n[target]: javascript:alert(1)"))
      .toContainEqual(expect.objectContaining({ code: "UNSAFE_LINK" }));
  });
});
