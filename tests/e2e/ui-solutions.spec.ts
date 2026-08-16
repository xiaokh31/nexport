import { expect, test } from "@playwright/test";

const solutions = [
  { title: "海外仓储与履约", slug: "warehouse", type: "WAREHOUSE" },
  { title: "一件代发", slug: "dropshipping", type: "DROPSHIPPING" },
  { title: "退货接收与换标", slug: "returns", type: "RETURNS" },
  { title: "FBA 入仓前准备", slug: "amazon-fba", type: "AMAZON_FBA" },
  { title: "FBA 预约与尾程交付", slug: "fba-last-mile", type: "FBA_LAST_MILE" },
  { title: "卡车运输衔接", slug: "truck-freight", type: "TRUCK_FREIGHT" },
  { title: "跨境运输协同", slug: "cross-border", type: "CROSS_BORDER" },
  { title: "快递与加急寄递", slug: "express", type: "EXPRESS" },
];

test("home presents the operating path, grouped solutions, and no fake company facts", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("#main-content");

  await expect(main.getByRole("heading", { level: 1 })).toHaveText("海外仓储、订单履约与运输衔接");
  for (const stage of ["入库接收", "上架存储", "拣配与增值处理", "出库交接"]) {
    await expect(main.getByRole("heading", { name: stage, exact: true })).toBeVisible();
  }
  for (const group of ["仓储履约", "FBA 准备与交付", "运输衔接"]) {
    await expect(main.getByRole("heading", { name: group, exact: true })).toBeVisible();
  }
  for (const solution of solutions) {
    await expect(main.getByRole("link", { name: solution.title, exact: true })).toHaveAttribute(
      "href",
      `/solutions/${solution.slug}`,
    );
    await expect(main.locator(`a[href="/contact?service=${solution.type}"]`).first()).toBeVisible();
  }

  await expect(page.locator('a[href="/services"], a[href^="/services/"]')).toHaveCount(0);
  await expect(main).not.toContainText(/服务客户|年行业经验|准时交付率|仓储面积|全球领先/);
});

test("solution index and detail expose scope, process, inputs, FAQ, and a selected quote", async ({ page }) => {
  await page.goto("/solutions");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("按实际作业目的找到对应入口");
  for (const group of ["仓储履约", "FBA 准备与交付", "运输衔接"]) {
    await expect(page.getByRole("heading", { name: group, exact: true })).toBeVisible();
  }
  for (const solution of solutions) {
    await expect(page.getByRole("link", { name: solution.title, exact: true }).first()).toHaveAttribute(
      "href",
      `/solutions/${solution.slug}`,
    );
    await expect(page.locator(`a[href="/contact?service=${solution.type}"]`).first()).toBeVisible();
  }

  await page.goto("/solutions/warehouse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("海外仓储与履约");
  for (const heading of ["服务范围", "作业流程", "询价前需准备", "常见问题"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText("不默认包含", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="/contact?service=WAREHOUSE"]')).toHaveCount(2);
  await page.getByText("页面中的服务范围可以调整吗？", { exact: true }).click();
  await expect(page.getByText(/页面列出的是通用边界/)).toBeVisible();
});

test("home, solution index, and detail do not overflow at narrow or wide widths", async ({ page }) => {
  for (const url of ["/", "/solutions", "/solutions/warehouse"]) {
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
