import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const articleSlug = "ui-003-responsive-article";

test.beforeAll(async () => {
  await prisma.article.deleteMany({ where: { slug: articleSlug } });
  await prisma.article.create({
    data: {
      title: "UI-003 responsive article",
      slug: articleSlug,
      excerpt: "Article layout fixture for narrow and wide public pages.",
      content: [
        "# Mobile-safe heading",
        "",
        "[A deliberately long link](https://example.com/this/is/a/deliberately/long/path/that/must/remain/inside/the/article/at/mobile/width)",
        "",
        "| Cargo reference | Handling instruction |",
        "| --- | --- |",
        "| VERY-LONG-CARGO-REFERENCE-WITHOUT-BREAKS | Keep the table in its own scroll region |",
        "",
        "```text",
        "VERY_LONG_CODE_LINE_WITHOUT_BREAKS_ABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789",
        "```",
      ].join("\n"),
      author: "UI fixture author",
      category: "industry",
      tags: ["responsive"],
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-15T12:00:00.000Z"),
    },
  });
});

test.afterAll(async () => {
  await prisma.article.deleteMany({ where: { slug: articleSlug } });
  await prisma.$disconnect();
});

test("quote intake hides placeholder facts and exposes grouped, preselected fields", async ({ page }) => {
  await page.goto("/contact?service=WAREHOUSE");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("提交货物与履约需求");
  await expect(page.getByRole("group", { name: "联系人资料" })).toBeVisible();
  await expect(page.getByRole("group", { name: "服务与线路" })).toBeVisible();
  await expect(page.getByRole("group", { name: "货物资料" })).toBeVisible();
  await expect(page.getByRole("group", { name: "需求说明与验证" })).toBeVisible();
  await expect(page.getByLabel(/服务类型/)).toContainText("海外仓储与履约");
  await expect(
    page.locator("#main-content").getByRole("link", { name: "隐私政策" }),
  ).toHaveAttribute("href", "/privacy");
  await expect(page.getByRole("heading", { name: "已配置的联系方式" })).toHaveCount(0);
  await expect(page.locator("#main-content")).not.toContainText(
    /contact@example\.com|\+1 \(555\) 000-0000|Address to be configured|周一至周五 8:30/,
  );

  const submit = page.getByRole("button", { name: "提交询价" });
  await submit.evaluate((button) => button.removeAttribute("disabled"));
  await submit.click();
  await expect(page.getByRole("alert").first()).toContainText("请检查标记的字段");
  await expect(page.getByLabel(/您的姓名/)).toBeFocused();
});

test("news filter and article content use accessible, contained regions", async ({ page }) => {
  await page.goto("/news?category=industry");
  await expect(page.getByRole("link", { name: "行业资讯", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "UI-003 responsive article", exact: true })).toBeVisible();

  await page.goto(`/news/${articleSlug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("UI-003 responsive article");
  await expect(page.getByRole("region", { name: "可横向滚动的文章表格" })).toBeVisible();
  await expect(page.getByRole("region", { name: "可横向滚动的代码块" })).toBeVisible();
  await expect(page.getByRole("link", { name: "A deliberately long link" })).toBeVisible();
});

test("contact, news, and article pages do not overflow from 320px to 1920px", async ({ page }) => {
  for (const url of ["/contact", "/news", `/news/${articleSlug}`]) {
    await page.goto(url);
    for (const viewport of [
      { width: 320, height: 760 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${url} at ${viewport.width}px`)
        .toBeLessThanOrEqual(viewport.width);
    }
  }
});
