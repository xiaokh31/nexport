import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("Google login stays hidden when its provider is not configured", async ({ page, request }) => {
  const providersResponse = await request.get("/api/auth/providers");
  expect(providersResponse.ok()).toBe(true);
  await expect(providersResponse.json()).resolves.not.toHaveProperty("google");

  await page.goto("/login");
  await expect(page.getByRole("button", { name: /google/i })).toHaveCount(0);
  await expect(page.locator('button[type="submit"]')).toBeDisabled();
  await expect(page.getByText(/verification is not configured/i)).toBeVisible();
});

test("external requests cannot create login history", async ({ request }) => {
  const response = await request.post("/api/user/login-history", {
    data: {
      userId: "fixture-customer",
      status: "SUCCESS",
    },
  });

  expect(response.status()).toBe(405);
});

test("the removed demo credentials do not create a session", async ({ request }) => {
  const historyCountBefore = await prisma.loginHistory.count();
  const csrfResponse = await request.get("/api/auth/csrf");
  const { csrfToken } = await csrfResponse.json();

  const callbackResponse = await request.post("/api/auth/callback/credentials", {
    headers: { "X-Auth-Return-Redirect": "1" },
    form: {
      csrfToken,
      email: "demo@example.com",
      password: "demo123",
      callbackUrl: "/dashboard",
      json: "true",
    },
  });
  const callback = await callbackResponse.json();

  expect(callback.url).toContain("error=");

  const sessionResponse = await request.get("/api/auth/session");
  await expect(sessionResponse.json()).resolves.not.toHaveProperty("user");
  await expect(prisma.loginHistory.count()).resolves.toBe(historyCountBefore);
});

test("direct registration cannot bypass a missing CAPTCHA token", async ({ request }) => {
  const userCountBefore = await prisma.user.count();
  const response = await request.post("/api/auth/register", {
    data: {
      name: "Direct Request",
      email: "direct-request@nexport.test",
      password: "not-a-production-password",
      confirmPassword: "not-a-production-password",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: expect.stringMatching(/人机验证|verification/i),
  });
  await expect(prisma.user.count()).resolves.toBe(userCountBefore);
});

test("missing CAPTCHA server configuration fails closed", async ({ request }) => {
  const userCountBefore = await prisma.user.count();
  const response = await request.post("/api/auth/register", {
    data: {
      name: "Forged Token",
      email: "forged-token@nexport.test",
      password: "not-a-production-password",
      confirmPassword: "not-a-production-password",
      captchaToken: "forged-token",
    },
  });

  expect(response.status()).toBe(503);
  await expect(prisma.user.count()).resolves.toBe(userCountBefore);
});
