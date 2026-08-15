import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, type Quote } from "@prisma/client";
import {
  ownedQuoteWhere,
  resolveQuoteOwnership,
} from "../../src/lib/quote/ownership";
import { fixtureUserIds } from "../fixtures/users.mjs";

const testReferencePrefix = "Q-SEC003-";
const registrationEmail = "sec003-historical@nexport.test";
let prisma: PrismaClient;

function quoteData(
  referenceSuffix: string,
  email: string,
  userId: string | null,
): Pick<
  Quote,
  | "reference"
  | "submissionKey"
  | "submissionFingerprint"
  | "userId"
  | "name"
  | "email"
  | "phone"
  | "serviceType"
  | "message"
> {
  return {
    reference: `${testReferencePrefix}${referenceSuffix}`,
    submissionKey: randomUUID(),
    submissionFingerprint: "a".repeat(64),
    userId,
    name: "SEC-003 Test",
    email,
    phone: "+1-555-0100",
    serviceType: "OTHER",
    message: "Quote ownership integration test",
  };
}

async function cleanup() {
  await prisma.quote.deleteMany({
    where: { reference: { startsWith: testReferencePrefix } },
  });
  await prisma.user.deleteMany({ where: { email: registrationEmail } });
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

describe("quote ownership persistence", () => {
  it("does not expose a historical anonymous quote after same-email registration", async () => {
    await prisma.quote.create({
      data: quoteData("HISTORICAL", registrationEmail, null),
    });
    const registeredUser = await prisma.user.create({
      data: { email: registrationEmail, name: "New registrant" },
    });

    const visibleQuotes = await prisma.quote.findMany({
      where: ownedQuoteWhere(registeredUser.id),
    });

    expect(visibleQuotes).toEqual([]);
    await expect(
      prisma.quote.findFirst({ where: { email: registrationEmail } }),
    ).resolves.toMatchObject({ userId: null });
  });

  it("does not let one user read another user's quote", async () => {
    await prisma.quote.createMany({
      data: [
        quoteData("USER-A", "customer@nexport.test", fixtureUserIds.customer),
        quoteData("USER-B", "partner@nexport.test", fixtureUserIds.partner),
      ],
    });

    const userAQuotes = await prisma.quote.findMany({
      where: ownedQuoteWhere(fixtureUserIds.customer),
      select: { reference: true, userId: true },
    });

    expect(userAQuotes).toEqual([
      {
        reference: `${testReferencePrefix}USER-A`,
        userId: fixtureUserIds.customer,
      },
    ]);
  });

  it("makes a logged-in user's new quote visible only to that user", async () => {
    const ownership = resolveQuoteOwnership(
      fixtureUserIds.customer,
      "partner@nexport.test",
    );
    await prisma.quote.create({
      data: quoteData("SESSION-OWNER", "partner@nexport.test", ownership.userId),
    });

    const [ownerQuotes, otherUserQuotes] = await Promise.all([
      prisma.quote.findMany({ where: ownedQuoteWhere(fixtureUserIds.customer) }),
      prisma.quote.findMany({ where: ownedQuoteWhere(fixtureUserIds.partner) }),
    ]);

    expect(ownerQuotes.map((quote) => quote.reference)).toContain(
      `${testReferencePrefix}SESSION-OWNER`,
    );
    expect(otherUserQuotes.map((quote) => quote.reference)).not.toContain(
      `${testReferencePrefix}SESSION-OWNER`,
    );
  });
});
