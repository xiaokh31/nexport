import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createPrismaRateLimitStore } from "../../src/lib/security/prisma-rate-limit-store";
import { createRateLimiter } from "../../src/lib/security/rate-limit";

const action = "test.integration-rate-limit";
let prisma: PrismaClient;

beforeAll(() => {
  if (process.env.NODE_ENV !== "test" || !process.env.DATABASE_URL_TEST) {
    throw new Error("Integration tests require the guarded test database runner.");
  }
  prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });
});

beforeEach(async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { action } });
});

afterAll(async () => {
  await prisma.rateLimitBucket.deleteMany({ where: { action } });
  await prisma.$disconnect();
});

describe("PostgreSQL rate-limit store", () => {
  it("atomically increments one HMAC bucket and enforces the limit", async () => {
    const limiter = createRateLimiter({
      store: createPrismaRateLimitStore(prisma),
      secret: "test-only-secret-with-at-least-32-bytes",
      clock: { now: () => new Date("2026-08-14T10:07:30.000Z") },
    });
    const policy = { action, limit: 2, windowMs: 15 * 60_000 };
    const subject = ["ip:203.0.113.10", "email:customer@nexport.test"];

    const results = await Promise.all(
      Array.from({ length: 12 }, () => limiter.consume(policy, subject)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(2);
    expect(results.filter((result) => !result.allowed)).toHaveLength(10);

    const buckets = await prisma.rateLimitBucket.findMany({ where: { action } });
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({
      action,
      count: 12,
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      windowStart: new Date("2026-08-14T10:00:00.000Z"),
      expiresAt: new Date("2026-08-14T10:15:00.000Z"),
    });
    expect(JSON.stringify(buckets)).not.toContain("203.0.113.10");
    expect(JSON.stringify(buckets)).not.toContain("customer@nexport.test");
  });
});
