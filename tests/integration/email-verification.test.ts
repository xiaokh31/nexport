import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  consumeEmailVerification,
  issueEmailVerification,
  requestEmailVerification,
} from "../../src/lib/auth/email-verification-service";
import { deriveRawEmailVerificationToken } from "../../src/lib/auth/email-verification-token";
import { emailOutboxPayloadSchema } from "../../src/lib/notifications/outbox-payload";
import { FakeRandomByteSource, FixedClock } from "../support/doubles";

const emailSuffix = "@auth001.nexport.test";
const secret = "auth001-test-secret-with-at-least-32-bytes";
const siteUrl = "https://www.example.com";
let prisma: PrismaClient;

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
}

function dependencies(clock: FixedClock, byteValues: number[]) {
  return {
    clock,
    randomBytes: new FakeRandomByteSource([byteValues]),
  };
}

async function createUnverifiedUser(label: string) {
  return prisma.user.create({
    data: {
      email: `${label}${emailSuffix}`,
      name: label,
      password: "test-password-hash",
      emailVerified: null,
      emailNotifications: false,
      quoteEmailUpdates: false,
      locale: "en",
    },
  });
}

async function issueForUser(
  user: { email: string; locale: string },
  clock: FixedClock,
  byteValue: number,
) {
  return prisma.$transaction((transaction) => issueEmailVerification(transaction, {
    email: user.email,
    locale: user.locale,
    config: { secret, siteUrl, emailFrom: "Nexport <security@example.com>" },
    dependencies: dependencies(clock, new Array(18).fill(byteValue)),
  }));
}

async function rawTokenForOutbox(outboxId: string) {
  const outbox = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: outboxId } });
  const payload = emailOutboxPayloadSchema.parse(outbox.payload);
  if (payload.kind !== "EMAIL_VERIFICATION") throw new Error("Unexpected payload kind");
  return {
    outbox,
    payload,
    rawToken: deriveRawEmailVerificationToken(payload.verificationId, secret),
  };
}

beforeAll(() => {
  if (process.env.NODE_ENV !== "test" || !process.env.DATABASE_URL_TEST) {
    throw new Error("Integration tests require the guarded test database runner.");
  }
  prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });
});

beforeEach(cleanup);

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("email verification persistence", () => {
  it("queues required mail without plaintext token and consumes it exactly once", async () => {
    const clock = new FixedClock("2026-08-14T00:00:00.000Z");
    const user = await createUnverifiedUser("consume");
    const issued = await issueForUser(user, clock, 1);
    const { outbox, payload, rawToken } = await rawTokenForOutbox(issued.outboxId);
    const storedToken = await prisma.verificationToken.findUniqueOrThrow({
      where: { token: issued.tokenHash },
    });

    expect(storedToken.token).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(outbox.payload)).not.toContain(rawToken);
    expect(payload.kind).toBe("EMAIL_VERIFICATION");
    expect(outbox.status).toBe("PENDING");
    await expect(consumeEmailVerification(prisma, { rawToken, secret, clock }))
      .resolves.toBe("VERIFIED");
    await expect(consumeEmailVerification(prisma, { rawToken, secret, clock }))
      .resolves.toBe("USED");
    await expect(prisma.user.findUnique({ where: { id: user.id } }))
      .resolves.toMatchObject({ emailVerified: clock.now() });
  });

  it("rejects expired, invalid, and concurrently replayed tokens", async () => {
    const expiredClock = new FixedClock("2026-08-14T00:00:00.000Z");
    const expiredUser = await createUnverifiedUser("expired");
    const expiredIssue = await issueForUser(expiredUser, expiredClock, 2);
    const expiredToken = await rawTokenForOutbox(expiredIssue.outboxId);
    expiredClock.advance(24 * 60 * 60 * 1000);

    await expect(consumeEmailVerification(prisma, {
      rawToken: expiredToken.rawToken,
      secret,
      clock: expiredClock,
    })).resolves.toBe("EXPIRED");
    await expect(consumeEmailVerification(prisma, {
      rawToken: "invalid-token",
      secret,
      clock: expiredClock,
    })).resolves.toBe("INVALID");

    const concurrentClock = new FixedClock("2026-08-14T01:00:00.000Z");
    const concurrentUser = await createUnverifiedUser("concurrent");
    const concurrentIssue = await issueForUser(concurrentUser, concurrentClock, 3);
    const concurrentToken = await rawTokenForOutbox(concurrentIssue.outboxId);
    const results = await Promise.all([
      consumeEmailVerification(prisma, {
        rawToken: concurrentToken.rawToken,
        secret,
        clock: concurrentClock,
      }),
      consumeEmailVerification(prisma, {
        rawToken: concurrentToken.rawToken,
        secret,
        clock: concurrentClock,
      }),
    ]);
    expect(results.sort()).toEqual(["USED", "VERIFIED"]);
  });

  it("requeues a failed delivery without creating another account, token, or outbox", async () => {
    const clock = new FixedClock("2026-08-14T02:00:00.000Z");
    const user = await createUnverifiedUser("retry");
    const issued = await issueForUser(user, clock, 4);
    await prisma.emailOutbox.update({
      where: { id: issued.outboxId },
      data: { status: "FAILED", attemptCount: 8, lastError: "HTTP_4XX:PERMANENT" },
    });

    await expect(requestEmailVerification(prisma, {
      email: user.email,
      config: { secret, siteUrl, emailFrom: "Nexport <security@example.com>" },
      dependencies: dependencies(clock, new Array(18).fill(5)),
    })).resolves.toBe("REUSED");
    await expect(prisma.user.count({ where: { email: user.email } })).resolves.toBe(1);
    await expect(prisma.verificationToken.count({ where: { identifier: user.email } }))
      .resolves.toBe(1);
    await expect(prisma.emailOutbox.count({ where: { recipient: user.email } }))
      .resolves.toBe(1);
    await expect(prisma.emailOutbox.findUnique({ where: { id: issued.outboxId } }))
      .resolves.toMatchObject({ status: "PENDING", attemptCount: 0, lastError: null });
  });

  it("issues one new challenge after a previously sent verification email", async () => {
    const clock = new FixedClock("2026-08-14T02:30:00.000Z");
    const user = await createUnverifiedUser("sent-resend");
    const issued = await issueForUser(user, clock, 7);
    await prisma.emailOutbox.update({
      where: { id: issued.outboxId },
      data: {
        status: "SENT",
        sentAt: clock.now(),
        providerMessageId: "provider-message-auth001",
      },
    });

    await expect(requestEmailVerification(prisma, {
      email: user.email,
      config: { secret, siteUrl, emailFrom: "Nexport <security@example.com>" },
      dependencies: dependencies(clock, new Array(18).fill(8)),
    })).resolves.toBe("QUEUED");
    await expect(prisma.verificationToken.count({ where: { identifier: user.email } }))
      .resolves.toBe(2);
    await expect(prisma.verificationToken.count({
      where: { identifier: user.email, consumedAt: null },
    })).resolves.toBe(1);
    await expect(prisma.emailOutbox.count({ where: { recipient: user.email } }))
      .resolves.toBe(2);
  });

  it("rolls back user, token, and outbox together when registration fails", async () => {
    const clock = new FixedClock("2026-08-14T03:00:00.000Z");
    const email = `rollback${emailSuffix}`;
    await expect(prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email, name: "rollback", password: "test-password-hash" },
      });
      await issueEmailVerification(transaction, {
        email: user.email,
        locale: user.locale,
        config: { secret, siteUrl, emailFrom: "Nexport <security@example.com>" },
        dependencies: dependencies(clock, new Array(18).fill(6)),
      });
      throw new Error("ROLLBACK_AUTH001");
    })).rejects.toThrow("ROLLBACK_AUTH001");

    await expect(prisma.user.count({ where: { email } })).resolves.toBe(0);
    await expect(prisma.verificationToken.count({ where: { identifier: email } }))
      .resolves.toBe(0);
    await expect(prisma.emailOutbox.count({ where: { recipient: email } })).resolves.toBe(0);
  });
});
