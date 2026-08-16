import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("UI-003 quote and news boundaries", () => {
  it("hides unconfigured contact facts and makes quote inputs the page purpose", () => {
    const contact = source("src/app/contact/page.tsx");

    expect(contact).toContain("isPlaceholderIdentityValue");
    expect(contact).toContain("<QuoteForm />");
    expect(contact).not.toContain("workHoursValue");
    expect(contact).not.toContain("Map Placeholder");
    expect(contact).not.toContain("bg-gradient");
  });

  it("announces validation, failure, loading, and success while retaining failed inputs", () => {
    const form = source("src/components/forms/quote-form.tsx");
    const formPrimitive = source("src/components/ui/form.tsx");
    const copy = source("src/config/public-page-content.ts");

    expect(form).toContain('role="alert" aria-live="assertive"');
    expect(form).toContain('role="status" aria-live="polite"');
    expect(form).toContain("form.handleSubmit(onSubmit, onInvalid)");
    expect(form).toContain("form.setFocus(firstField)");
    expect(form).toContain("setSubmitError(copy.submitFailure)");
    expect(form).not.toContain("error.message");
    expect(form).not.toContain("console.error");
    expect(formPrimitive).toContain('aria-live="polite"');
    expect(copy).toContain("已填写的内容仍保留在表单中");

    const successBranch = form.indexOf("if (response.ok)");
    const reset = form.indexOf("form.reset()");
    const failureBranch = form.indexOf("} else {", successBranch);
    expect(reset).toBeGreaterThan(successBranch);
    expect(reset).toBeLessThan(failureBranch);
  });

  it("groups form controls semantically and links the published privacy policy", () => {
    const form = source("src/components/forms/quote-form.tsx");

    expect(form).toContain("<fieldset");
    expect(form).toContain("<legend");
    expect(form).toContain('aria-required="true"');
    expect(form).toContain('href="/privacy"');
    expect(form).toContain("maxLength={4_000}");
    expect(form).toContain("data-quote-captcha");
  });

  it("keeps the news list server-rendered with current-filter, pagination, and directed empty semantics", () => {
    const news = source("src/app/news/page.tsx");
    const loading = source("src/app/news/loading.tsx");
    const error = source("src/app/news/error.tsx");

    expect(news).not.toContain('"use client"');
    expect(news).toContain("listPublishedArticles");
    expect(news).toContain('aria-current={active ? "page" : undefined}');
    expect(news).toContain('<Link rel="prev"');
    expect(news).toContain('<Link rel="next"');
    expect(news).toContain("该分类暂无已发布内容");
    expect(news).toContain('href="/news"');
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-busy="true"');
    expect(error).toContain('role="alert"');
    expect(error).toContain("reset");
  });

  it("contains article images, code, tables, and long links within mobile-safe regions", () => {
    const detail = source("src/app/news/[slug]/page.tsx");
    const markdown = source("src/components/content/safe-markdown.tsx");

    expect(detail).not.toContain('"use client"');
    expect(detail).toContain("displayAuthor = isPlaceholderIdentityValue");
    expect(detail).not.toContain("bg-gradient");
    expect(markdown).toContain("max-w-full");
    expect(markdown).toContain("[overflow-wrap:anywhere]");
    expect(markdown).toContain("data-markdown-table");
    expect(markdown).toContain("data-markdown-code");
    expect(markdown).toContain('role="region"');
    expect(markdown).toContain("overflow-x-auto");
    expect(markdown).toContain("break-all");
  });
});
