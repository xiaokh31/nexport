import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

interface ApiCheck {
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  allowedUserId: string;
  deniedUserId: string;
  allowedStatuses: number[];
}

const apiChecks: ApiCheck[] = [
  {
    name: "admin.overview",
    method: "GET",
    path: "/api/admin/stats",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-staff-editor",
    allowedStatuses: [200],
  },
  {
    name: "quotes.read",
    method: "GET",
    path: "/api/admin/quotes",
    allowedUserId: "fixture-staff-no-editor",
    deniedUserId: "fixture-warehouse",
    allowedStatuses: [200],
  },
  {
    name: "quotes.update",
    method: "PATCH",
    path: "/api/admin/quotes",
    allowedUserId: "fixture-finance",
    deniedUserId: "fixture-warehouse",
    allowedStatuses: [400],
  },
  {
    name: "quotes.delete",
    method: "DELETE",
    path: "/api/admin/quotes",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-staff-editor",
    allowedStatuses: [400],
  },
  {
    name: "articles.manage",
    method: "GET",
    path: "/api/admin/articles",
    allowedUserId: "fixture-staff-editor",
    deniedUserId: "fixture-staff-no-editor",
    allowedStatuses: [200],
  },
  {
    name: "pages.manage",
    method: "GET",
    path: "/api/admin/pages",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-staff-editor",
    allowedStatuses: [200],
  },
  {
    name: "users.manage",
    method: "GET",
    path: "/api/admin/users",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-finance",
    allowedStatuses: [200],
  },
  {
    name: "notifications.broadcast",
    method: "POST",
    path: "/api/notifications",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-staff-editor",
    allowedStatuses: [400],
  },
  {
    name: "settings.manage",
    method: "GET",
    path: "/api/admin/settings",
    allowedUserId: "fixture-admin",
    deniedUserId: "fixture-finance",
    allowedStatuses: [200],
  },
];

async function authenticate(page: Page, userId: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for RBAC E2E tests");

  const sessionToken = await encode({
    secret,
    token: {
      id: userId,
      sub: userId,
      role: "CUSTOMER",
      canManageArticles: false,
    },
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

async function callApi(page: Page, check: ApiCheck) {
  return page.request.fetch(check.path, {
    method: check.method,
    data: check.method === "GET" ? undefined : {},
  });
}

test.afterEach(async () => {
  await prisma.user.updateMany({
    where: { id: "fixture-staff-editor" },
    data: { role: "STAFF", canManageArticles: true },
  });
  await prisma.user.updateMany({
    where: { id: "fixture-admin" },
    data: { role: "ADMIN", canManageArticles: false },
  });
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

for (const check of apiChecks) {
  test(`${check.name} API has an allow and deny case`, async ({ page }) => {
    await authenticate(page, check.allowedUserId);
    const allowed = await callApi(page, check);
    expect(check.allowedStatuses).toContain(allowed.status());

    await authenticate(page, check.deniedUserId);
    const denied = await callApi(page, check);
    expect(denied.status()).toBe(403);
  });
}

test("revoked article permission is enforced on the next sensitive request", async ({
  page,
}) => {
  await authenticate(page, "fixture-staff-editor");
  expect((await page.request.get("/api/admin/articles")).status()).toBe(200);

  await prisma.user.update({
    where: { id: "fixture-staff-editor" },
    data: { canManageArticles: false },
  });

  expect((await page.request.get("/api/admin/articles")).status()).toBe(403);
});

test("the last administrator cannot downgrade their own account", async ({ page }) => {
  await authenticate(page, "fixture-admin");
  const response = await page.request.patch("/api/admin/users", {
    data: { id: "fixture-admin", role: "CUSTOMER" },
  });

  expect(response.status()).toBe(409);
  await expect(prisma.user.findUnique({ where: { id: "fixture-admin" } }))
    .resolves.toMatchObject({ role: "ADMIN" });
});

test("the last administrator cannot be deleted", async ({ page }) => {
  await authenticate(page, "fixture-admin");
  const response = await page.request.delete(
    "/api/admin/users?id=fixture-admin",
  );

  expect(response.status()).toBe(409);
  await expect(prisma.user.findUnique({ where: { id: "fixture-admin" } }))
    .resolves.toMatchObject({ role: "ADMIN" });
});

test("leaving STAFF clears the article capability flag", async ({ page }) => {
  await authenticate(page, "fixture-admin");
  const response = await page.request.patch("/api/admin/users", {
    data: { id: "fixture-staff-editor", role: "FINANCE" },
  });

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    user: { role: "FINANCE", canManageArticles: false },
  });
});

test("STAFF lands on quotes and sees only matrix-derived modules", async ({ page }) => {
  await authenticate(page, "fixture-staff-no-editor");
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/quotes$/);
  await expect(page.getByRole("link", { name: "询价管理" })).toBeVisible();
  await expect(page.getByRole("link", { name: "概览" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "文章管理" })).toHaveCount(0);
});

test("WAREHOUSE gets an explicit denial instead of an admin loading loop", async ({ page }) => {
  await authenticate(page, "fixture-warehouse");
  await page.goto("/admin");

  await expect(page.getByText("当前账户没有后台访问能力。")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回用户中心" })).toBeVisible();
});
