import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  BroadcastRequestConflictError,
  broadcastNotifications,
} from "../../src/lib/notifications/broadcast";
import { createEmailIdempotencyKey } from "../../src/lib/notifications/idempotency";
import {
  createQuoteEventNotifications,
  enqueueRequiredEmail,
} from "../../src/lib/notifications/domain";
import { processEmailOutbox } from "../../src/lib/notifications/outbox-worker";
import { PrismaEmailOutboxStore } from "../../src/lib/notifications/prisma-outbox-store";
import { FixedClock, RecordingEmailSender } from "../support/doubles";

const prefix = "NOTIF001-";
const emailSuffix = "@notif001.nexport.test";
let prisma: PrismaClient;

async function cleanup() {
  const [quotes, broadcasts] = await Promise.all([
    prisma.quote.findMany({
      where: { reference: { startsWith: prefix } },
      select: { events: { select: { id: true } } },
    }),
    prisma.notificationBroadcast.findMany({
      where: { title: { startsWith: prefix } },
      select: { id: true },
    }),
  ]);
  const eventKeys = [
    ...quotes.flatMap((quote) => quote.events.map((event) => `quote-event/${event.id}`)),
    ...broadcasts.map((broadcast) => `broadcast/${broadcast.id}`),
  ];
  if (eventKeys.length > 0) {
    await prisma.notification.deleteMany({ where: { eventKey: { in: eventKeys } } });
    await prisma.emailOutbox.deleteMany({ where: { eventKey: { in: eventKeys } } });
  }
  await prisma.emailOutbox.deleteMany({
    where: { eventKey: { startsWith: "security/NOTIF001/" } },
  });
  await prisma.notificationBroadcast.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.quote.deleteMany({ where: { reference: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: emailSuffix } } });
}

async function createUser(
  label: string,
  input: {
    verified?: boolean;
    emailNotifications?: boolean;
    quoteEmailUpdates?: boolean;
  } = {},
) {
  return prisma.user.create({
    data: {
      email: `${label}${emailSuffix}`,
      name: label,
      emailVerified: input.verified === false ? null : new Date("2026-01-01T00:00:00.000Z"),
      emailNotifications: input.emailNotifications ?? true,
      quoteEmailUpdates: input.quoteEmailUpdates ?? true,
      locale: "en",
    },
  });
}

async function createStatusArtifacts(userId: string | null, label: string) {
  return prisma.$transaction(async (transaction) => {
    const createdQuote = await transaction.quote.create({
      data: {
        reference: `${prefix}${label}`,
        submissionKey: randomUUID(),
        submissionFingerprint: "a".repeat(64),
        userId,
        name: label,
        email: `${label}${emailSuffix}`,
        phone: "+1-555-0100",
        serviceType: "OTHER",
        message: "NOTIF-001 integration test",
        status: "PROCESSING",
      },
    });
    const quote = await transaction.quote.update({
      where: { id: createdQuote.id },
      data: { status: "QUOTED", amount: "125.00", currency: "CAD" },
    });
    const event = await transaction.quoteEvent.create({
      data: {
        quoteId: quote.id,
        fromStatus: "PROCESSING",
        toStatus: "QUOTED",
        requestKey: randomUUID(),
      },
    });
    const result = await createQuoteEventNotifications(transaction, {
      eventId: event.id,
      userId,
      reference: quote.reference,
      status: "QUOTED",
      amount: "125.00",
      currency: "CAD",
      emailFrom: "Nexport <notifications@example.com>",
    });
    return { quote, event, result };
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

describe("notification persistence", () => {
  it("always creates account in-app notifications and applies both verified-email preferences", async () => {
    const enabled = await createUser("enabled");
    const globallyDisabled = await createUser("global-off", { emailNotifications: false });
    const quoteDisabled = await createUser("quote-off", { quoteEmailUpdates: false });
    const unverified = await createUser("unverified", { verified: false });

    const results = await Promise.all([
      createStatusArtifacts(enabled.id, "ENABLED"),
      createStatusArtifacts(globallyDisabled.id, "GLOBAL-OFF"),
      createStatusArtifacts(quoteDisabled.id, "QUOTE-OFF"),
      createStatusArtifacts(unverified.id, "UNVERIFIED"),
      createStatusArtifacts(null, "ANONYMOUS"),
    ]);

    expect(results.map((entry) => entry.result)).toEqual([
      { inAppCreated: true, emailQueued: true },
      { inAppCreated: true, emailQueued: false },
      { inAppCreated: true, emailQueued: false },
      { inAppCreated: true, emailQueued: false },
      { inAppCreated: false, emailQueued: false },
    ]);
    await expect(prisma.notification.count()).resolves.toBe(4);
    await expect(prisma.emailOutbox.count()).resolves.toBe(1);
  });

  it("rolls back QuoteEvent, notification, and outbox together", async () => {
    const user = await createUser("rollback");
    const quote = await prisma.quote.create({
      data: {
        reference: `${prefix}ROLLBACK`,
        submissionKey: randomUUID(),
        submissionFingerprint: "b".repeat(64),
        userId: user.id,
        name: "rollback",
        email: user.email,
        phone: "+1-555-0101",
        serviceType: "OTHER",
        message: "rollback test",
        status: "PROCESSING",
      },
    });

    await expect(prisma.$transaction(async (transaction) => {
      const event = await transaction.quoteEvent.create({
        data: {
          quoteId: quote.id,
          fromStatus: "PROCESSING",
          toStatus: "QUOTED",
          requestKey: randomUUID(),
        },
      });
      await createQuoteEventNotifications(transaction, {
        eventId: event.id,
        userId: user.id,
        reference: quote.reference,
        status: "QUOTED",
        amount: "10.00",
        currency: "CAD",
        emailFrom: "Nexport <notifications@example.com>",
      });
      throw new Error("ROLLBACK_TEST");
    })).rejects.toThrow("ROLLBACK_TEST");

    await expect(prisma.quoteEvent.count({ where: { quoteId: quote.id } })).resolves.toBe(0);
    await expect(prisma.notification.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.emailOutbox.count()).resolves.toBe(0);
  });

  it("keeps the committed business event and in-app notification when the provider fails", async () => {
    const user = await createUser("provider-failure");
    const artifacts = await createStatusArtifacts(user.id, "PROVIDER-FAILURE");
    const summary = await processEmailOutbox({
      store: new PrismaEmailOutboxStore(prisma),
      sender: new RecordingEmailSender("http-5xx"),
      clock: new FixedClock("2030-01-01T00:00:00.000Z"),
      logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    });

    expect(summary).toMatchObject({ claimed: 1, retried: 1 });
    await expect(prisma.quoteEvent.findUnique({ where: { id: artifacts.event.id } }))
      .resolves.not.toBeNull();
    await expect(prisma.notification.findUnique({
      where: {
        userId_eventKey: {
          userId: user.id,
          eventKey: `quote-event/${artifacts.event.id}`,
        },
      },
    })).resolves.not.toBeNull();
    await expect(prisma.emailOutbox.findUnique({
      where: { idempotencyKey: createEmailIdempotencyKey(
        `quote-event/${artifacts.event.id}`,
        user.email,
      ) },
    })).resolves.toMatchObject({ status: "PENDING", attemptCount: 1 });
  });

  it("queues required security mail even when optional email preferences are off", async () => {
    const user = await createUser("required", {
      emailNotifications: false,
      quoteEmailUpdates: false,
    });
    await prisma.$transaction((transaction) => enqueueRequiredEmail(transaction, {
      eventKey: `security/NOTIF001/${randomUUID()}`,
      recipient: user.email,
      from: "Nexport <security@example.com>",
      subject: "Verify your email",
      html: "<p>Verify</p>",
    }));

    await expect(prisma.emailOutbox.findFirst({ where: { recipient: user.email } }))
      .resolves.toMatchObject({ status: "PENDING" });
  });

  it("reports broadcast recipients, replays identical requests, and rejects changed payloads", async () => {
    const actor = await createUser("broadcast-actor");
    await createUser("broadcast-target-1");
    await createUser("broadcast-target-2");
    const requestKey = randomUUID();
    const expectedRecipients = await prisma.user.count();
    const input = {
      requestKey,
      sendToAll: true,
      type: "SYSTEM" as const,
      title: `${prefix}Broadcast`,
      content: "Scheduled maintenance",
      link: "/user/notifications",
    };

    const first = await broadcastNotifications(prisma, actor.id, input);
    const replay = await broadcastNotifications(prisma, actor.id, input);
    expect(first).toMatchObject({ recipientCount: expectedRecipients, replayed: false });
    expect(replay).toMatchObject({
      broadcastId: first.broadcastId,
      recipientCount: expectedRecipients,
      replayed: true,
    });
    await expect(prisma.notification.count({
      where: { eventKey: `broadcast/${first.broadcastId}` },
    })).resolves.toBe(expectedRecipients);
    const delivered = await prisma.notification.findFirstOrThrow({
      where: { eventKey: `broadcast/${first.broadcastId}` },
      select: { id: true },
    });
    await prisma.notification.delete({ where: { id: delivered.id } });
    await expect(broadcastNotifications(prisma, actor.id, input)).resolves.toMatchObject({
      recipientCount: expectedRecipients,
      replayed: true,
    });
    await expect(broadcastNotifications(prisma, actor.id, {
      ...input,
      content: "Changed content",
    })).rejects.toBeInstanceOf(BroadcastRequestConflictError);
  });
});
