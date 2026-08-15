import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  hashRateLimitSubject,
  RATE_LIMIT_POLICIES,
  type RateLimitBucketIncrement,
} from "../../src/lib/security/rate-limit";

describe("persistent rate-limit contract", () => {
  it("uses the documented default windows and limits", () => {
    expect(RATE_LIMIT_POLICIES).toMatchObject({
      credentialsLogin: { limit: 10, windowMs: 15 * 60_000 },
      registration: { limit: 5, windowMs: 60 * 60_000 },
      quoteByIp: { limit: 10, windowMs: 60 * 60_000 },
      quoteByEmail: { limit: 3, windowMs: 60 * 60_000 },
      resendVerification: { limit: 3, windowMs: 60 * 60_000 },
    });
  });

  it("stores only an HMAC key and rejects requests beyond the window limit", async () => {
    const increments: RateLimitBucketIncrement[] = [];
    let count = 0;
    const limiter = createRateLimiter({
      secret: "test-only-secret-with-at-least-32-bytes",
      clock: { now: () => new Date("2026-08-14T10:07:30.000Z") },
      store: {
        increment: async (bucket) => {
          increments.push(bucket);
          count += 1;
          return count;
        },
      },
    });
    const policy = { action: "test.action", limit: 2, windowMs: 15 * 60_000 };
    const subject = ["ip:203.0.113.10", "email:customer@example.com"];

    await expect(limiter.consume(policy, subject)).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    await expect(limiter.consume(policy, subject)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(limiter.consume(policy, subject)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 450,
    });

    expect(increments[0]).toMatchObject({
      action: "test.action",
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      windowStart: new Date("2026-08-14T10:00:00.000Z"),
      expiresAt: new Date("2026-08-14T10:15:00.000Z"),
    });
    expect(JSON.stringify(increments)).not.toContain("203.0.113.10");
    expect(JSON.stringify(increments)).not.toContain("customer@example.com");
  });

  it("binds HMAC values to both action and subject", () => {
    const secret = "test-only-secret-with-at-least-32-bytes";

    expect(hashRateLimitSubject(secret, "login", ["subject-a"]))
      .not.toBe(hashRateLimitSubject(secret, "register", ["subject-a"]));
    expect(hashRateLimitSubject(secret, "login", ["subject-a"]))
      .not.toBe(hashRateLimitSubject(secret, "login", ["subject-b"]));
  });
});
