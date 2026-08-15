import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const prisma = new PrismaClient();
const referencePrefix = "Q-QUOTE001-E2E-";

async function cleanup() {
  const quotes = await prisma.quote.findMany({
    where: { reference: { startsWith: referencePrefix } },
    select: { events: { select: { id: true } } },
  });
  const eventKeys = quotes.flatMap((quote) =>
    quote.events.map((event) => `quote-event/${event.id}`),
  );
  if (eventKeys.length > 0) {
    await prisma.notification.deleteMany({ where: { eventKey: { in: eventKeys } } });
    await prisma.emailOutbox.deleteMany({ where: { eventKey: { in: eventKeys } } });
  }
  await prisma.quote.deleteMany({
    where: { reference: { startsWith: referencePrefix } },
  });
  await prisma.rateLimitBucket.deleteMany({
    where: { action: { in: ["quote.ip", "quote.email"] } },
  });
}

async function authenticate(
  page: Page,
  user: { id: string; role: string; name: string; email: string },
) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for quote E2E tests");
  const sessionToken = await encode({
    secret,
    token: {
      id: user.id,
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  });
  await page.context().clearCookies();
  await page.context().addCookies([{
    name: "next-auth.session-token",
    value: sessionToken,
    url: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100",
  }]);
}

test.beforeEach(cleanup);
test.afterEach(cleanup);
test.afterAll(async () => prisma.$disconnect());

test("public quote submission fails closed without a server CAPTCHA token", async ({
  request,
}) => {
  const before = await prisma.quote.count();
  const response = await request.post("/api/quote", {
    data: {
      submissionKey: randomUUID(),
      name: "Direct Quote",
      email: "direct-quote@nexport.test",
      phone: "+1 555 0100",
      serviceType: "OTHER",
      message: "A direct request without server CAPTCHA verification",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    success: false,
    error: { code: "CAPTCHA_REQUIRED" },
  });
  await expect(prisma.quote.count()).resolves.toBe(before);
});

test("admin status updates are idempotent and the customer sees only published fields", async ({
  page,
}) => {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: "fixture-admin" },
  });
  const customer = await prisma.user.findUniqueOrThrow({
    where: { id: "fixture-customer" },
  });
  const quote = await prisma.quote.create({
    data: {
      reference: `${referencePrefix}FLOW`,
      submissionKey: randomUUID(),
      submissionFingerprint: "d".repeat(64),
      userId: customer.id,
      name: "Fixture customer",
      email: customer.email,
      phone: "+1 555 0101",
      serviceType: "WAREHOUSE",
      message: "Complete API workflow test quote",
      internalNote: "Never expose this internal note",
    },
  });
  const draftQuote = await prisma.quote.create({
    data: {
      reference: `${referencePrefix}DRAFT`,
      submissionKey: randomUUID(),
      submissionFingerprint: "e".repeat(64),
      userId: customer.id,
      name: "Fixture customer",
      email: customer.email,
      phone: "+1 555 0102",
      serviceType: "OTHER",
      message: "Draft pricing must remain private",
      status: "PROCESSING",
      amount: "99.00",
      currency: "USD",
      customerNote: "Unpublished draft note",
      internalNote: "Internal draft note",
    },
  });
  await authenticate(page, {
    id: admin.id,
    role: admin.role,
    name: admin.name || "Admin",
    email: admin.email,
  });

  const processing = await page.request.patch("/api/admin/quotes", {
    data: {
      id: quote.id,
      requestKey: randomUUID(),
      status: "PROCESSING",
    },
  });
  expect(processing.ok()).toBe(true);

  const invalidAmount = await page.request.patch("/api/admin/quotes", {
    data: {
      id: quote.id,
      requestKey: randomUUID(),
      amount: "0",
      currency: "USD",
    },
  });
  const invalidStatus = await page.request.patch("/api/admin/quotes", {
    data: {
      id: quote.id,
      requestKey: randomUUID(),
      status: "UNKNOWN",
    },
  });
  expect(invalidAmount.status()).toBe(400);
  expect(invalidStatus.status()).toBe(400);

  const quoteRequestKey = randomUUID();
  const quotedPayload = {
    id: quote.id,
    requestKey: quoteRequestKey,
    status: "QUOTED",
    amount: "250.00",
    currency: "USD",
    customerNote: "Published customer note",
  };
  const first = await page.request.patch("/api/admin/quotes", {
    data: quotedPayload,
  });
  const replay = await page.request.patch("/api/admin/quotes", {
    data: quotedPayload,
  });
  expect(first.ok()).toBe(true);
  expect(replay.ok()).toBe(true);
  await expect(replay.json()).resolves.toMatchObject({ replayed: true });
  await expect(prisma.quoteEvent.count({ where: { quoteId: quote.id } }))
    .resolves.toBe(2);
  await expect(prisma.notification.count({ where: { userId: customer.id } }))
    .resolves.toBe(2);
  await expect(prisma.emailOutbox.count({ where: { recipient: customer.email } }))
    .resolves.toBe(2);

  const adminList = await page.request.get(
    `/api/admin/quotes?search=${encodeURIComponent(quote.reference)}`,
  );
  expect(adminList.ok()).toBe(true);
  const adminResult = await adminList.json();
  expect(adminResult.quotes[0]).not.toHaveProperty("submissionFingerprint");
  expect(adminResult.quotes[0]).not.toHaveProperty("submissionKey");

  await authenticate(page, {
    id: customer.id,
    role: customer.role,
    name: customer.name || "Customer",
    email: customer.email,
  });
  const customerList = await page.request.get("/api/user/quotes");
  expect(customerList.ok()).toBe(true);
  const customerResult = await customerList.json();
  const visibleQuote = customerResult.quotes.find(
    (entry: { reference: string }) => entry.reference === quote.reference,
  );
  expect(visibleQuote).toMatchObject({
    amount: "250",
    currency: "USD",
    customerNote: "Published customer note",
  });
  expect(visibleQuote).not.toHaveProperty("internalNote");
  const hiddenDraft = customerResult.quotes.find(
    (entry: { reference: string }) => entry.reference === draftQuote.reference,
  );
  expect(hiddenDraft).toMatchObject({
    amount: null,
    currency: null,
    customerNote: null,
    quotedAt: null,
  });
  expect(hiddenDraft).not.toHaveProperty("internalNote");
});
