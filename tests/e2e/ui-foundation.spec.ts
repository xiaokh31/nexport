import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 760 },
  { width: 375, height: 812 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

test("global shell remains usable and overflow-free from 320px through 1920px", async ({ page }) => {
  await page.goto("/");

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await expect(page.locator("[data-site-header]")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(viewport.width);
    await expect(
      page.getByRole("button", { name: /^切换语言/ }),
    ).toHaveCount(1);
  }

  await page.setViewportSize({ width: 320, height: 760 });
  await expect(page.getByRole("button", { name: "打开菜单" })).toBeVisible();
  await page.getByRole("button", { name: "打开菜单" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "网站导航" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "关闭菜单" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("navigation", { name: "主要导航" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开菜单" })).toBeHidden();
});

test("skip link, palette, and placeholder hiding are present in the rendered shell", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Tab");

  const skipLink = page.getByRole("link", { name: "跳到主要内容" });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  expect(await page.locator("body").evaluate((node) => getComputedStyle(node).backgroundColor))
    .toBe("rgb(250, 251, 248)");
  expect(await page.locator("[data-site-header]").evaluate((node) => getComputedStyle(node).backgroundColor))
    .toBe("rgb(16, 38, 50)");

  const shellText = await page.locator("header, footer").allTextContents();
  expect(shellText.join("\n")).not.toMatch(
    /contact@example\.com|\+1 \(555\) 000-0000|Address to be configured/,
  );
});
