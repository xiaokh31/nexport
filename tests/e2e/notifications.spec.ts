import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const eventPrefix = "e2e-notif/";
const broadcastTitle = "NOTIF001 E2E broadcast";

async function authenticate(page: Page, userId: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for notification E2E tests");
  const sessionToken = await encode({
    secret,
    token: { id: userId, sub: userId, role: "CUSTOMER", canManageArticles: false },
  });
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

async function cleanup() {
  const broadcasts = await prisma.notificationBroadcast.findMany({
    where: { title: broadcastTitle },
    select: { id: true },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [
        { eventKey: { startsWith: eventPrefix } },
        { eventKey: { in: broadcasts.map((entry) => `broadcast/${entry.id}`) } },
      ],
    },
  });
  await prisma.notificationBroadcast.deleteMany({ where: { title: broadcastTitle } });
}

test.beforeEach(cleanup);
test.afterEach(cleanup);
test.afterAll(async () => prisma.$disconnect());

test("a user can read and mutate only their own notifications", async ({ page }) => {
  const [own, other] = await Promise.all([
    prisma.notification.create({
      data: {
        userId: "fixture-customer",
        eventKey: `${eventPrefix}${randomUUID()}`,
        type: "SYSTEM",
        title: "Own notification",
        content: "Visible to owner",
      },
    }),
    prisma.notification.create({
      data: {
        userId: "fixture-partner",
        eventKey: `${eventPrefix}${randomUUID()}`,
        type: "SYSTEM",
        title: "Other notification",
        content: "Must not be visible",
      },
    }),
  ]);
  await authenticate(page, "fixture-customer");

  const listResponse = await page.request.get("/api/notifications?limit=100");
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  expect(list.notifications.map((entry: { id: string }) => entry.id)).toContain(own.id);
  expect(list.notifications.map((entry: { id: string }) => entry.id)).not.toContain(other.id);

  expect((await page.request.patch("/api/notifications", {
    data: { notificationId: other.id },
  })).status()).toBe(404);
  expect((await page.request.delete(`/api/notifications?id=${other.id}`)).status()).toBe(404);
  expect((await page.request.patch("/api/notifications", {
    data: { notificationId: own.id },
  })).status()).toBe(200);
  expect((await page.request.delete(`/api/notifications?id=${own.id}`)).status()).toBe(200);
});

test("an admin broadcast is idempotent and reports its recipients", async ({ page }) => {
  await authenticate(page, "fixture-admin");
  const requestKey = randomUUID();
  const expectedRecipients = await prisma.user.count();
  const payload = {
    requestKey,
    sendToAll: true,
    type: "SYSTEM",
    title: broadcastTitle,
    content: "Maintenance window",
    link: "/user/notifications",
  };

  const first = await page.request.post("/api/notifications", { data: payload });
  expect(first.status()).toBe(200);
  await expect(first.json()).resolves.toMatchObject({
    recipientCount: expectedRecipients,
    replayed: false,
  });

  const replay = await page.request.post("/api/notifications", { data: payload });
  expect(replay.status()).toBe(200);
  await expect(replay.json()).resolves.toMatchObject({
    recipientCount: expectedRecipients,
    replayed: true,
  });

  const conflict = await page.request.post("/api/notifications", {
    data: { ...payload, content: "Changed maintenance window" },
  });
  expect(conflict.status()).toBe(409);
});
