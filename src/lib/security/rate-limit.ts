import { createHmac } from "node:crypto";
import type { Clock } from "@/lib/ports/external-services";

export interface RateLimitPolicy {
  action: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitBucketIncrement {
  action: string;
  keyHash: string;
  windowStart: Date;
  expiresAt: Date;
}

export interface RateLimitStore {
  increment(bucket: RateLimitBucketIncrement): Promise<number>;
}

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: Date }
  | { allowed: false; retryAfterSeconds: number; resetAt: Date };

export interface RateLimiter {
  consume(policy: RateLimitPolicy, subject: readonly string[]): Promise<RateLimitResult>;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const RATE_LIMIT_POLICIES = Object.freeze({
  credentialsLogin: Object.freeze({
    action: "auth.credentials",
    limit: 10,
    windowMs: 15 * MINUTE,
  }),
  registration: Object.freeze({
    action: "auth.register",
    limit: 5,
    windowMs: HOUR,
  }),
  quoteByIp: Object.freeze({
    action: "quote.ip",
    limit: 10,
    windowMs: HOUR,
  }),
  quoteByEmail: Object.freeze({
    action: "quote.email",
    limit: 3,
    windowMs: HOUR,
  }),
  resendVerification: Object.freeze({
    action: "auth.resend-verification",
    limit: 3,
    windowMs: HOUR,
  }),
} satisfies Record<string, RateLimitPolicy>);

export function clientIpRateLimitSubject(clientIp: string | null): string {
  return `ip:${clientIp || "unavailable"}`;
}

export function emailRateLimitSubject(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

export function hashRateLimitSubject(
  secret: string,
  action: string,
  subject: readonly string[],
): string {
  return createHmac("sha256", secret)
    .update(action)
    .update("\0")
    .update(JSON.stringify(subject))
    .digest("hex");
}

export function createRateLimiter({
  store,
  secret,
  clock,
}: {
  store: RateLimitStore;
  secret: string;
  clock: Clock;
}): RateLimiter {
  return Object.freeze<RateLimiter>({
    async consume(policy, subject) {
      if (!subject.length || subject.some((part) => !part)) {
        throw new Error("Rate-limit subjects must be non-empty.");
      }

      const now = clock.now();
      const windowStartMs = Math.floor(now.getTime() / policy.windowMs) * policy.windowMs;
      const windowStart = new Date(windowStartMs);
      const resetAt = new Date(windowStartMs + policy.windowMs);
      const keyHash = hashRateLimitSubject(secret, policy.action, subject);
      const count = await store.increment({
        action: policy.action,
        keyHash,
        windowStart,
        expiresAt: resetAt,
      });

      if (count > policy.limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((resetAt.getTime() - now.getTime()) / 1_000),
          ),
          resetAt,
        };
      }

      return {
        allowed: true,
        remaining: policy.limit - count,
        resetAt,
      };
    },
  });
}
