import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  parseEmailArgument,
  promoteVerifiedUserToAdmin,
} from "../../scripts/admin/promote.mjs";

const verifiedEmail = "rbac-promote@nexport.test";
const unverifiedEmail = "rbac-unverified@nexport.test";
let prisma: PrismaClient;

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { in: [verifiedEmail, unverifiedEmail] } },
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

describe("administrator promotion", () => {
  it("normalizes the explicit email argument", () => {
    expect(parseEmailArgument(["--email", " RBAC-PROMOTE@NEXPORT.TEST "]))
      .toBe(verifiedEmail);
    expect(() => parseEmailArgument([])).toThrow("Usage:");
  });

  it("promotes an existing verified user idempotently without credentials", async () => {
    await prisma.user.create({
      data: {
        email: verifiedEmail,
        emailVerified: new Date("2026-08-14T00:00:00.000Z"),
        password: null,
        role: "CUSTOMER",
      },
    });

    await expect(promoteVerifiedUserToAdmin(prisma, verifiedEmail)).resolves
      .toMatchObject({ changed: true, user: { role: "ADMIN", password: null } });
    await expect(promoteVerifiedUserToAdmin(prisma, verifiedEmail)).resolves
      .toMatchObject({ changed: false, user: { role: "ADMIN", password: null } });
  });

  it("refuses to promote an unverified account", async () => {
    await prisma.user.create({
      data: { email: unverifiedEmail, emailVerified: null, password: null },
    });

    await expect(promoteVerifiedUserToAdmin(prisma, unverifiedEmail)).rejects
      .toThrow("must verify their email");
  });
});
