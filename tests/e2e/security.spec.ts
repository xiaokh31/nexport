import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const ownershipReferencePrefix = "Q-SEC003-E2E-";

test.afterEach(async () => {
  await prisma.quote.deleteMany({
    where: { reference: { startsWith: ownershipReferencePrefix } },
  });
});

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
  await expect(page.getByRole("alert")).toContainText(
    /人机验证服务未配置|verification is not configured/i,
  );
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

test("anonymous callers cannot forge quote ownership query parameters", async ({ request }) => {
  const response = await request.get(
    "/api/user/quotes?userId=fixture-partner&email=partner%40nexport.test",
  );

  expect(response.status()).toBe(401);
});

test("an authenticated user cannot read another user's quote through forged parameters", async ({
  page,
}) => {
  await prisma.quote.createMany({
    data: [
      {
        reference: `${ownershipReferencePrefix}USER-A`,
        submissionKey: randomUUID(),
        submissionFingerprint: "b".repeat(64),
        userId: "fixture-customer",
        name: "Customer quote",
        email: "customer@nexport.test",
        phone: "+1-555-0101",
        serviceType: "OTHER",
        message: "Quote owned by the authenticated customer",
      },
      {
        reference: `${ownershipReferencePrefix}USER-B`,
        submissionKey: randomUUID(),
        submissionFingerprint: "c".repeat(64),
        userId: "fixture-partner",
        name: "Partner quote",
        email: "customer@nexport.test",
        phone: "+1-555-0102",
        serviceType: "OTHER",
        message: "Quote owned by a different authenticated user",
      },
    ],
  });

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for authenticated E2E tests");
  }
  const sessionToken = await encode({
    secret,
    token: {
      id: "fixture-customer",
      sub: "fixture-customer",
      role: "CUSTOMER",
      name: "Fixture customer",
      email: "customer@nexport.test",
    },
  });
  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
    },
  ]);

  const response = await page.request.get(
    "/api/user/quotes?userId=fixture-partner&email=customer%40nexport.test",
  );
  expect(response.ok()).toBe(true);
  const payload = await response.json();

  expect(
    payload.quotes.map((quote: { reference: string }) => quote.reference),
  ).toEqual([`${ownershipReferencePrefix}USER-A`]);
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
