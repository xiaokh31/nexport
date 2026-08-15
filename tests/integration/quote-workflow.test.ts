import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { SERVICE_TYPES, type ServiceType } from "../../src/config/quote";
import {
  QuoteWorkflowError,
  softDeleteQuote,
  updateQuoteWorkflow,
} from "../../src/lib/quote/admin-service";
import { submitQuote } from "../../src/lib/quote/submission";
import { quoteFormSchema } from "../../src/lib/validations";
import { FakeQuoteReferenceGenerator, FixedClock } from "../support/doubles";
import { fixtureUserIds } from "../fixtures/users.mjs";

const referencePrefix = "Q-QUOTE001-";
const emailSuffix = "@quote001.nexport.test";
const emailFrom = "Nexport <quotes@example.com>";
let prisma: PrismaClient;

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
  await prisma.user.deleteMany({ where: { email: { endsWith: emailSuffix } } });
}

async function createCustomer(label: string) {
  return prisma.user.create({
    data: {
      email: `${label}${emailSuffix}`,
      name: label,
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
      emailNotifications: true,
      quoteEmailUpdates: true,
      locale: "en",
    },
  });
}

function formData(label: string, serviceType: ServiceType) {
  return quoteFormSchema.parse({
    submissionKey: randomUUID(),
    name: `Customer ${label}`,
    email: `${label}${emailSuffix}`,
    phone: "+1 555 0100",
    company: "Example Company",
    serviceType,
    origin: "Edmonton",
    destination: "Calgary",
    cargoType: "Cartons",
    pieceCount: 10,
    cartonCount: 2,
    palletCount: 1,
    weightValue: "125.500",
    weightUnit: "KG",
    length: "100",
    width: "80",
    height: "60",
    dimensionUnit: "CM",
    requestedDate: "2099-01-01",
    message: `Complete QUOTE-001 request for ${serviceType}`,
    captchaToken: `captcha-${label}`,
  });
}

async function createOwnedQuote(
  label: string,
  customerId: string,
  serviceType: ServiceType = "OTHER",
) {
  const reference = `${referencePrefix}${label}`;
  const result = await submitQuote(prisma, {
    data: formData(label, serviceType),
    sessionUserId: customerId,
    referenceGenerator: new FakeQuoteReferenceGenerator([reference]),
  });
  if (result.outcome !== "CREATED") throw new Error(result.outcome);
  return prisma.quote.findUniqueOrThrow({ where: { reference } });
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

describe("quote workflow persistence", () => {
  it("runs all nine service types through ownership, admin status, and notifications", async () => {
    const customer = await createCustomer("all-services");
    const clock = new FixedClock("2026-08-14T12:00:00.000Z");

    for (const [index, serviceType] of SERVICE_TYPES.entries()) {
      const quote = await createOwnedQuote(
        `SERVICE-${index}`,
        customer.id,
        serviceType,
      );
      await updateQuoteWorkflow(prisma, {
        actorId: fixtureUserIds["staff-no-editor"],
        actorRole: "STAFF",
        update: {
          id: quote.id,
          requestKey: randomUUID(),
          status: "PROCESSING",
        },
        emailFrom,
        clock,
      });
      await updateQuoteWorkflow(prisma, {
        actorId: fixtureUserIds.finance,
        actorRole: "FINANCE",
        update: {
          id: quote.id,
          requestKey: randomUUID(),
          status: "QUOTED",
          amount: "125.50",
          currency: "USD",
          customerNote: `Published quote for ${serviceType}`,
        },
        emailFrom,
        clock,
      });
    }

    const quotes = await prisma.quote.findMany({
      where: { reference: { startsWith: `${referencePrefix}SERVICE-` } },
      select: {
        userId: true,
        serviceType: true,
        status: true,
        events: { select: { id: true } },
      },
    });
    expect(new Set(quotes.map((quote) => quote.serviceType)))
      .toEqual(new Set(SERVICE_TYPES));
    expect(quotes).toHaveLength(SERVICE_TYPES.length);
    expect(quotes.every((quote) =>
      quote.userId === customer.id &&
      quote.status === "QUOTED" &&
      quote.events.length === 2
    )).toBe(true);
    await expect(prisma.notification.count({ where: { userId: customer.id } }))
      .resolves.toBe(SERVICE_TYPES.length * 2);
    await expect(prisma.emailOutbox.count({
      where: { recipient: customer.email },
    })).resolves.toBe(SERVICE_TYPES.length * 2);
  });

  it("keeps an anonymous inquiry unowned and creates no customer notification", async () => {
    const data = formData("anonymous", "OTHER");
    const result = await submitQuote(prisma, {
      data,
      sessionUserId: null,
      referenceGenerator: new FakeQuoteReferenceGenerator([
        `${referencePrefix}ANONYMOUS`,
      ]),
    });
    if (result.outcome !== "CREATED") throw new Error(result.outcome);
    const quote = await prisma.quote.findUniqueOrThrow({
      where: { reference: result.reference },
    });
    const transition = await updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds["staff-no-editor"],
      actorRole: "STAFF",
      update: {
        id: quote.id,
        requestKey: randomUUID(),
        status: "PROCESSING",
      },
      emailFrom,
      clock: new FixedClock("2026-08-14T12:30:00.000Z"),
    });

    expect(quote.userId).toBeNull();
    await expect(prisma.notification.count({
      where: { eventKey: `quote-event/${transition.eventId}` },
    })).resolves.toBe(0);
    await expect(prisma.emailOutbox.count({
      where: { eventKey: `quote-event/${transition.eventId}` },
    })).resolves.toBe(0);
  });

  it("serializes concurrent same-status updates and replays a request key once", async () => {
    const customer = await createCustomer("concurrent");
    const quote = await createOwnedQuote("CONCURRENT", customer.id);
    const clock = new FixedClock("2026-08-14T13:00:00.000Z");
    const firstKey = randomUUID();
    const results = await Promise.all([
      updateQuoteWorkflow(prisma, {
        actorId: fixtureUserIds["staff-no-editor"],
        actorRole: "STAFF",
        update: { id: quote.id, requestKey: firstKey, status: "PROCESSING" },
        emailFrom,
        clock,
      }),
      updateQuoteWorkflow(prisma, {
        actorId: fixtureUserIds["staff-no-editor"],
        actorRole: "STAFF",
        update: { id: quote.id, requestKey: randomUUID(), status: "PROCESSING" },
        emailFrom,
        clock,
      }),
    ]);
    const persistedEvent = await prisma.quoteEvent.findFirstOrThrow({
      where: { quoteId: quote.id },
      select: { requestKey: true },
    });
    const replay = await updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds["staff-no-editor"],
      actorRole: "STAFF",
      update: {
        id: quote.id,
        requestKey: persistedEvent.requestKey,
        status: "PROCESSING",
      },
      emailFrom,
      clock,
    });

    expect(results.filter((result) => result.eventId)).toHaveLength(1);
    expect(replay.replayed).toBe(true);
    await expect(prisma.quoteEvent.count({ where: { quoteId: quote.id } }))
      .resolves.toBe(1);
    await expect(prisma.notification.count({ where: { userId: customer.id } }))
      .resolves.toBe(1);
    await expect(prisma.emailOutbox.count({ where: { recipient: customer.email } }))
      .resolves.toBe(1);
  });

  it("rejects forbidden fields, invalid transitions, and reopening CLOSED", async () => {
    const customer = await createCustomer("invalid");
    const quote = await createOwnedQuote("INVALID", customer.id);
    const clock = new FixedClock("2026-08-14T14:00:00.000Z");

    await expect(updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.finance,
      actorRole: "FINANCE",
      update: { id: quote.id, requestKey: randomUUID(), status: "PROCESSING" },
      emailFrom,
      clock,
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.admin,
      actorRole: "ADMIN",
      update: { id: quote.id, requestKey: randomUUID(), status: "CLOSED" },
      emailFrom,
      clock,
    })).rejects.toMatchObject({ code: "REASON_REQUIRED" });

    await updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.admin,
      actorRole: "ADMIN",
      update: {
        id: quote.id,
        requestKey: randomUUID(),
        status: "CLOSED",
        reason: "Duplicate request closed by administrator",
      },
      emailFrom,
      clock,
    });
    await expect(updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.admin,
      actorRole: "ADMIN",
      update: { id: quote.id, requestKey: randomUUID(), status: "PROCESSING" },
      emailFrom,
      clock,
    })).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("soft-deletes only PENDING records that never entered processing", async () => {
    const customer = await createCustomer("deletion");
    const fresh = await createOwnedQuote("DELETE-FRESH", customer.id);
    const rolledBack = await createOwnedQuote("DELETE-ROLLBACK", customer.id);
    const clock = new FixedClock("2026-08-14T15:00:00.000Z");

    await updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.admin,
      actorRole: "ADMIN",
      update: {
        id: rolledBack.id,
        requestKey: randomUUID(),
        status: "PROCESSING",
      },
      emailFrom,
      clock,
    });
    await updateQuoteWorkflow(prisma, {
      actorId: fixtureUserIds.admin,
      actorRole: "ADMIN",
      update: {
        id: rolledBack.id,
        requestKey: randomUUID(),
        status: "PENDING",
        reason: "Returned for corrected intake information",
      },
      emailFrom,
      clock,
    });

    await softDeleteQuote(prisma, {
      actorId: fixtureUserIds.admin,
      deletion: {
        id: fresh.id,
        reason: "Duplicate test submission removed",
      },
      clock,
    });
    await expect(prisma.quote.findUnique({ where: { id: fresh.id } }))
      .resolves.toMatchObject({
        deletedAt: clock.now(),
        deletedById: fixtureUserIds.admin,
      });
    await expect(softDeleteQuote(prisma, {
      actorId: fixtureUserIds.admin,
      deletion: {
        id: rolledBack.id,
        reason: "Attempted deletion after processing",
      },
      clock,
    })).rejects.toBeInstanceOf(QuoteWorkflowError);
  });
});
