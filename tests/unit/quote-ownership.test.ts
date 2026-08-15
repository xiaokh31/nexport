import { describe, expect, it } from "vitest";
import {
  ownedQuoteWhere,
  resolveQuoteOwnership,
} from "../../src/lib/quote/ownership";

describe("quote ownership", () => {
  it("keeps an anonymous quote unowned", () => {
    expect(resolveQuoteOwnership(null, " Customer@Example.COM ")).toEqual({
      userId: null,
      fingerprintSubject: "anonymous:customer@example.com",
    });
  });

  it("uses only the authenticated session id as owner", () => {
    expect(resolveQuoteOwnership("user-a", "user-b@example.com")).toEqual({
      userId: "user-a",
      fingerprintSubject: "user:user-a",
    });
  });

  it("builds a read filter that cannot be widened by email or request parameters", () => {
    expect(ownedQuoteWhere("user-a")).toEqual({
      userId: "user-a",
      deletedAt: null,
    });
    expect(() => ownedQuoteWhere("")).toThrow("authenticated user id");
  });
});
