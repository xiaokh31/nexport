import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

async function authenticate(page: Page, userId = "fixture-customer") {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for UI-004 E2E tests");
  const sessionToken = await encode({
    secret,
    token: { id: userId, sub: userId, role: "CUSTOMER", canManageArticles: false },
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

const quote = {
  id: "ui-004-quote",
  reference: "Q-UI004-REAL",
  name: "UI Customer",
  email: "customer@nexport.test",
  phone: "+1 555 0100",
  company: null,
  serviceType: "TRUCK_FREIGHT",
  origin: "Calgary",
  destination: "Edmonton",
  cargoType: "Cartons",
  pieceCount: 10,
  cartonCount: 2,
  palletCount: 1,
  weightValue: "100",
  weightUnit: "kg",
  length: null,
  width: null,
  height: null,
  dimensionUnit: null,
  requestedDate: null,
  message: "Real UI-004 quote request",
  status: "PROCESSING",
  amount: null,
  currency: null,
  customerNote: null,
  quotedAt: null,
  createdAt: "2026-08-15T12:00:00.000Z",
  updatedAt: "2026-08-15T12:00:00.000Z",
};

const notification = {
  id: "ui-004-notification",
  type: "QUOTE",
  title: "UI-004 通知",
  content: "询价状态已更新。",
  link: "/user/quotes",
  isRead: false,
  createdAt: "2026-08-15T12:00:00.000Z",
};

test("auth checkpoint is readable and overflow-free at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await expect(page.getByText("把每次询价放回同一条工作流。")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "创建账户" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("dashboard renders only mocked real quotes and notifications", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/user/quotes?**", (route) => route.fulfill({ json: { quotes: [quote], total: 1, page: 1, pages: 1 } }));
  await page.route("**/api/notifications?**", (route) => route.fulfill({ json: { notifications: [notification], total: 1, unreadCount: 1, page: 1, pages: 1 } }));

  await page.goto("/dashboard");
  await expect(page.getByText("Q-UI004-REAL")).toBeVisible();
  await expect(page.getByText("UI-004 通知")).toBeVisible();
  await expect(page.getByText(/库存概览|待处理订单|运输中/)).toHaveCount(0);
});

test("quote table scrolls internally on mobile without widening the document", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/user/quotes?**", (route) => route.fulfill({ json: { quotes: [quote], total: 1, page: 1, pages: 1 } }));
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/user/quotes");

  const tableRegion = page.locator("[data-responsive-table]");
  await expect(tableRegion).toBeVisible();
  expect(await tableRegion.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("notification deletion requires a confirmation dialog", async ({ page }) => {
  await authenticate(page);
  await page.route("**/api/notifications?**", (route) => route.fulfill({ json: { notifications: [notification], total: 1, unreadCount: 1, page: 1, pages: 1 } }));
  await page.route("**/api/notifications?id=**", (route) => route.fulfill({ json: { success: true } }));
  await page.goto("/user/notifications");

  await page.getByRole("button", { name: "删除：UI-004 通知" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "删除这条通知？" })).toBeVisible();
  await dialog.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("UI-004 通知")).toHaveCount(0);
});
