import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import {
  deriveRawEmailVerificationToken,
  hashEmailVerificationToken,
} from "../../src/lib/auth/email-verification-token";

const prisma = new PrismaClient();
const emailSuffix = "@auth001-e2e.nexport.test";

async function cleanup() {
  const tokens = await prisma.verificationToken.findMany({
    where: { identifier: { endsWith: emailSuffix } },
    select: { token: true },
  });
  await prisma.emailOutbox.deleteMany({
    where: { eventKey: { in: tokens.map((token) => `email-verification/${token.token}`) } },
  });
  await prisma.verificationToken.deleteMany({
    where: { identifier: { endsWith: emailSuffix } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: emailSuffix } } });
  await prisma.rateLimitBucket.deleteMany({
    where: { action: "auth.resend-verification" },
  });
}

async function createVerification(label: string, byteValue: number, expires: Date) {
  const email = `${label}${emailSuffix}`;
  const verificationId = Buffer.alloc(18, byteValue).toString("base64url");
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for verification E2E tests");
  const rawToken = deriveRawEmailVerificationToken(verificationId, secret);
  await prisma.user.create({
    data: { email, name: label, password: "test-password-hash", emailVerified: null },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashEmailVerificationToken(rawToken),
      expires,
    },
  });
  return { email, rawToken };
}

test.beforeEach(cleanup);
test.afterEach(cleanup);
test.afterAll(async () => prisma.$disconnect());

test("the verification page consumes a token once and rejects replay", async ({ page }) => {
  const verification = await createVerification(
    "consume",
    8,
    new Date(Date.now() + 60 * 60 * 1000),
  );
  await page.goto(`/verify-email?token=${encodeURIComponent(verification.rawToken)}`);
  await page.getByRole("button", { name: /验证邮箱|verify email|vérifier/i }).click();
  await expect(page.getByText(/邮箱验证成功|email verified|e-mail vérifié/i)).toBeVisible();
  await expect(prisma.user.findUnique({ where: { email: verification.email } }))
    .resolves.toMatchObject({ emailVerified: expect.any(Date) });

  await page.goto(`/verify-email?token=${encodeURIComponent(verification.rawToken)}`);
  await page.getByRole("button", { name: /验证邮箱|verify email|vérifier/i }).click();
  await expect(page.getByText(/已经使用|already been used|déjà été utilisé/i)).toBeVisible();
});

test("the verification page reports an expired token", async ({ page }) => {
  const verification = await createVerification(
    "expired",
    9,
    new Date(Date.now() - 60 * 1000),
  );
  await page.goto(`/verify-email?token=${encodeURIComponent(verification.rawToken)}`);
  await page.getByRole("button", { name: /验证邮箱|verify email|vérifier/i }).click();
  await expect(page.getByText(/已过期|has expired|a expiré/i)).toBeVisible();
});

test("resend responses are generic and limited to three requests per email per hour", async ({
  request,
}) => {
  const existing = await createVerification(
    "resend",
    10,
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const existingResponse = await request.post("/api/auth/resend-verification", {
    data: { email: existing.email },
  });
  const missingResponse = await request.post("/api/auth/resend-verification", {
    data: { email: `missing${emailSuffix}` },
  });
  expect(existingResponse.status()).toBe(202);
  expect(missingResponse.status()).toBe(202);
  expect(await existingResponse.json()).toEqual(await missingResponse.json());

  const limitedEmail = `limited${emailSuffix}`;
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    statuses.push((await request.post("/api/auth/resend-verification", {
      data: { email: limitedEmail },
    })).status());
  }
  expect(statuses).toEqual([202, 202, 202, 429]);
});
