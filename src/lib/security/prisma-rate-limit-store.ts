import type { PrismaClient } from "@prisma/client";
import type { RateLimitStore } from "@/lib/security/rate-limit";

export function createPrismaRateLimitStore(
  client: Pick<PrismaClient, "rateLimitBucket">,
): RateLimitStore {
  return Object.freeze({
    async increment(bucket) {
      const result = await client.rateLimitBucket.upsert({
        where: {
          action_keyHash_windowStart: {
            action: bucket.action,
            keyHash: bucket.keyHash,
            windowStart: bucket.windowStart,
          },
        },
        create: { ...bucket, count: 1 },
        update: {
          count: { increment: 1 },
          expiresAt: bucket.expiresAt,
        },
        select: { count: true },
      });

      return result.count;
    },
  });
}
