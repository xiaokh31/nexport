import { describe, expect, it } from "vitest";
import { fixtureUsers } from "../fixtures/users.mjs";

describe("role fixtures", () => {
  it("covers every supported role and both STAFF article capabilities", () => {
    expect(new Set(fixtureUsers.map((user) => user.role))).toEqual(new Set([
      "ADMIN",
      "STAFF",
      "FINANCE",
      "WAREHOUSE",
      "CUSTOMER",
      "PARTNER",
    ]));
    expect(fixtureUsers.filter((user) => user.role === "STAFF").map(
      (user) => user.canManageArticles,
    )).toEqual([true, false]);
  });

  it("contains no default credential", () => {
    expect(fixtureUsers.every((user) => user.password === null)).toBe(true);
    expect(fixtureUsers.every((user) => user.email.endsWith("@nexport.test"))).toBe(true);
  });
});
