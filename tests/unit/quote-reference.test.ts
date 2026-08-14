import { describe, expect, it } from "vitest";
import { createQuoteReferenceGenerator } from "../../src/lib/quote/reference";
import { FakeRandomByteSource, FixedClock } from "../support/doubles";

describe("quote reference generator", () => {
  it("uses injected time and cryptographic-byte source", () => {
    const generator = createQuoteReferenceGenerator({
      clock: new FixedClock("2026-08-14T23:59:59.000Z"),
      randomBytes: new FakeRandomByteSource([[0, 0, 0, 0, 0]]),
    });

    expect(generator.generate()).toBe("Q-20260814-00000000");
  });

  it("requires exactly five random bytes", () => {
    const generator = createQuoteReferenceGenerator({
      clock: new FixedClock("2026-08-14T00:00:00.000Z"),
      randomBytes: new FakeRandomByteSource([[1, 2, 3, 4]]),
    });

    expect(() => generator.generate()).toThrow("Expected 5 fake random bytes");
  });
});
