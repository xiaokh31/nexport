import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { fixtureUsers } from "../fixtures/users.mjs";

let prisma: PrismaClient;

beforeAll(() => {
  if (process.env.NODE_ENV !== "test" || !process.env.DATABASE_URL_TEST) {
    throw new Error("Integration tests require the guarded test database runner.");
  }
  prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL_TEST });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("database fixtures", () => {
  it("loads every role without a password", async () => {
    const users = await prisma.user.findMany({
      where: { id: { in: fixtureUsers.map((user) => user.id) } },
      orderBy: { email: "asc" },
    });

    expect(users).toHaveLength(fixtureUsers.length);
    expect(users.every((user) => user.password === null)).toBe(true);
    expect(users.filter((user) => user.role === "STAFF").map(
      (user) => user.canManageArticles,
    ).sort()).toEqual([false, true]);
  });
});
