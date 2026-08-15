import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createEmailIdempotencyKey } from "../../src/lib/notifications/idempotency";
import { EMAIL_OUTBOX_LEASE_MS } from "../../src/lib/notifications/outbox-worker";
import { PrismaEmailOutboxStore } from "../../src/lib/notifications/prisma-outbox-store";

const eventPrefix = "worker/NOTIF001/";
let prisma: PrismaClient;

async function cleanup() {
  await prisma.emailOutbox.deleteMany({ where: { eventKey: { startsWith: eventPrefix } } });
}

async function createOutbox(overrides: {
  status?: "PENDING" | "PROCESSING";
  lockedAt?: Date | null;
  firstAttemptAt?: Date | null;
} = {}) {
  const eventKey = `${eventPrefix}${randomUUID()}`;
  const recipient = "worker@notif001.nexport.test";
  return prisma.emailOutbox.create({
    data: {
      eventKey,
      recipient,
      idempotencyKey: createEmailIdempotencyKey(eventKey, recipient),
      payload: {
        version: 1,
        kind: "QUOTE_STATUS",
        from: "Nexport <notifications@example.com>",
        subject: "Quote updated",
        html: "<p>Updated</p>",
      },
      status: overrides.status ?? "PENDING",
      lockedAt: overrides.lockedAt,
      firstAttemptAt: overrides.firstAttemptAt,
      nextAttemptAt: new Date("2026-08-14T00:00:00.000Z"),
    },
  });
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

describe("Prisma email outbox leases", () => {
  it("allows only one concurrent worker to claim a due record", async () => {
    const outbox = await createOutbox();
    const now = new Date("2026-08-14T01:00:00.000Z");
    const stores = Array.from({ length: 8 }, () => new PrismaEmailOutboxStore(prisma));
    const claims = (await Promise.all(stores.map((store) => store.claimBatch({
      now,
      leaseMs: EMAIL_OUTBOX_LEASE_MS,
      limit: 1,
    })))).flat();

    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ id: outbox.id, attemptCount: 1 });
  });

  it("recovers an expired lock and rejects completion from the stale lease", async () => {
    const firstAttemptAt = new Date("2026-08-14T00:00:00.000Z");
    const originalLock = new Date("2026-08-14T00:01:00.000Z");
    const outbox = await createOutbox({
      status: "PROCESSING",
      lockedAt: originalLock,
      firstAttemptAt,
    });
    const store = new PrismaEmailOutboxStore(prisma);
    const claims = await store.claimBatch({
      now: new Date("2026-08-14T00:10:00.000Z"),
      leaseMs: EMAIL_OUTBOX_LEASE_MS,
      limit: 1,
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({
      id: outbox.id,
      recoveredFromExpiredLease: true,
      firstAttemptAt,
    });
    await expect(store.markSent({
      id: outbox.id,
      lockedAt: originalLock,
      sentAt: new Date("2026-08-14T00:11:00.000Z"),
      providerMessageId: "stale-worker-message",
    })).resolves.toBe(false);
  });
});
