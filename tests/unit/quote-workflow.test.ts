import { describe, expect, it } from "vitest";
import { QUOTE_STATUSES, type QuoteStatus } from "../../src/config/quote";
import {
  canEditQuoteCustomerNote,
  canEditQuoteInternalNote,
  canEditQuotePricing,
  canTransitionQuote,
  quoteTransitionRequiresReason,
  type QuoteActorRole,
} from "../../src/lib/quote/workflow";

const expectedTransitions: Array<[
  QuoteStatus,
  QuoteStatus,
  readonly QuoteActorRole[],
]> = [
  ["PENDING", "PROCESSING", ["ADMIN", "STAFF"]],
  ["PENDING", "CLOSED", ["ADMIN"]],
  ["PROCESSING", "PENDING", ["ADMIN"]],
  ["PROCESSING", "QUOTED", ["ADMIN", "STAFF", "FINANCE"]],
  ["PROCESSING", "CLOSED", ["ADMIN"]],
  ["QUOTED", "PROCESSING", ["ADMIN"]],
  ["QUOTED", "ACCEPTED", ["ADMIN"]],
  ["QUOTED", "REJECTED", ["ADMIN"]],
  ["QUOTED", "CLOSED", ["ADMIN"]],
  ["ACCEPTED", "QUOTED", ["ADMIN"]],
  ["ACCEPTED", "CLOSED", ["ADMIN"]],
  ["REJECTED", "QUOTED", ["ADMIN"]],
  ["REJECTED", "CLOSED", ["ADMIN"]],
];

describe("quote workflow contract", () => {
  it("implements only the documented role transition matrix", () => {
    const roles: QuoteActorRole[] = ["ADMIN", "STAFF", "FINANCE"];
    for (const from of QUOTE_STATUSES) {
      for (const to of QUOTE_STATUSES) {
        for (const role of roles) {
          const expected = expectedTransitions.some(
            ([expectedFrom, expectedTo, allowedRoles]) =>
              expectedFrom === from &&
              expectedTo === to &&
              allowedRoles.includes(role),
          );
          expect(canTransitionQuote(role, from, to), `${role} ${from} -> ${to}`)
            .toBe(expected);
        }
      }
    }
  });

  it("keeps CLOSED terminal and requires reasons for rollback or early closure", () => {
    for (const target of QUOTE_STATUSES) {
      expect(canTransitionQuote("ADMIN", "CLOSED", target)).toBe(false);
    }
    expect(quoteTransitionRequiresReason("PENDING", "CLOSED")).toBe(true);
    expect(quoteTransitionRequiresReason("QUOTED", "PROCESSING")).toBe(true);
    expect(quoteTransitionRequiresReason("REJECTED", "QUOTED")).toBe(true);
    expect(quoteTransitionRequiresReason("ACCEPTED", "CLOSED")).toBe(false);
  });

  it("implements the exact field editing matrix", () => {
    expect(canEditQuotePricing("ADMIN", "PROCESSING")).toBe(true);
    expect(canEditQuotePricing("FINANCE", "PROCESSING")).toBe(true);
    expect(canEditQuotePricing("STAFF", "PROCESSING")).toBe(false);
    expect(canEditQuotePricing("ADMIN", "QUOTED")).toBe(false);

    expect(canEditQuoteCustomerNote("STAFF", "PROCESSING")).toBe(true);
    expect(canEditQuoteCustomerNote("FINANCE", "PROCESSING")).toBe(true);
    expect(canEditQuoteCustomerNote("ADMIN", "QUOTED")).toBe(false);

    expect(canEditQuoteInternalNote("ADMIN", "PENDING")).toBe(true);
    expect(canEditQuoteInternalNote("STAFF", "QUOTED")).toBe(true);
    expect(canEditQuoteInternalNote("FINANCE", "PROCESSING")).toBe(false);
    expect(canEditQuoteInternalNote("ADMIN", "CLOSED")).toBe(false);
  });
});
