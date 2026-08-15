import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { SERVICE_TYPES } from "../../src/config/quote";
import {
  quoteAdminUpdateSchema,
  quoteFormSchema,
} from "../../src/lib/validations";
import { createQuoteSubmissionFingerprint } from "../../src/lib/quote/submission";

function quoteInput(overrides: Record<string, unknown> = {}) {
  return {
    submissionKey: randomUUID(),
    name: "  Test Customer  ",
    email: " CUSTOMER@Example.COM ",
    phone: " +1 555 0100 ",
    company: "  Example Company  ",
    serviceType: "OTHER",
    origin: " Edmonton ",
    destination: " Calgary ",
    cargoType: " Cartons ",
    pieceCount: 0,
    cartonCount: 12,
    palletCount: 1,
    weightValue: "100.500",
    weightUnit: "KG",
    length: "10.000",
    width: "20.000",
    height: "30.000",
    dimensionUnit: "CM",
    requestedDate: "2099-01-01",
    message: "  A complete quote request for testing.  ",
    captchaToken: "captcha-one",
    ...overrides,
  };
}

describe("quote submission contract", () => {
  it.each(SERVICE_TYPES)("accepts the stable %s service type", (serviceType) => {
    expect(quoteFormSchema.parse(quoteInput({ serviceType }))).toMatchObject({
      serviceType,
      email: "customer@example.com",
    });
  });

  it("canonicalizes business content and excludes CAPTCHA from the fingerprint", () => {
    const first = quoteFormSchema.parse(quoteInput());
    const retry = quoteFormSchema.parse(quoteInput({
      submissionKey: first.submissionKey,
      captchaToken: "captcha-two",
      email: "customer@example.com",
      company: "Example Company",
      weightValue: "100.5",
      length: "10",
      width: "20",
      height: "30",
    }));

    expect(createQuoteSubmissionFingerprint(first, "anonymous:customer@example.com"))
      .toBe(createQuoteSubmissionFingerprint(retry, "anonymous:customer@example.com"));
    expect(createQuoteSubmissionFingerprint(first, "user:user-a"))
      .not.toBe(createQuoteSubmissionFingerprint(first, "user:user-b"));
  });

  it("rejects invalid units, partial dimensions, past dates, unknown fields, and amounts", () => {
    expect(() => quoteFormSchema.parse(quoteInput({ weightUnit: "TON" }))).toThrow();
    expect(() => quoteFormSchema.parse(quoteInput({ height: undefined }))).toThrow();
    expect(() => quoteFormSchema.parse(quoteInput({ requestedDate: "2020-01-01" }))).toThrow();
    expect(() => quoteFormSchema.parse(quoteInput({ status: "QUOTED" }))).toThrow();
    expect(() => quoteAdminUpdateSchema.parse({
      id: "quote-id",
      requestKey: randomUUID(),
      amount: "0",
      currency: "USD",
    })).toThrow();
    expect(() => quoteAdminUpdateSchema.parse({
      id: "quote-id",
      requestKey: randomUUID(),
      amount: "10.00",
      currency: "US",
    })).toThrow();
  });
});
