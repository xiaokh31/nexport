import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FakeCaptchaVerifier,
  FakeQuoteReferenceGenerator,
  FixedClock,
  RecordingEmailSender,
} from "../support/doubles";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("test-only dependency doubles", () => {
  it("provides controllable time and references", () => {
    const clock = new FixedClock("2026-08-14T10:00:00.000Z");
    const references = new FakeQuoteReferenceGenerator(["Q-20260814-TEST0001"]);

    clock.advance(60_000);

    expect(clock.now().toISOString()).toBe("2026-08-14T10:01:00.000Z");
    expect(references.generate()).toBe("Q-20260814-TEST0001");
  });

  it("records CAPTCHA requests without network access", async () => {
    const verifier = new FakeCaptchaVerifier({
      success: false,
      reason: "TIMEOUT",
    });

    await expect(verifier.verify({ token: "fixture-token" })).resolves.toEqual({
      success: false,
      reason: "TIMEOUT",
    });
    expect(verifier.requests).toEqual([{ token: "fixture-token" }]);
  });

  it.each([
    ["success", { success: true, providerMessageId: "fake-message-1" }],
    ["timeout", { success: false, reason: "TIMEOUT", retryable: true, ambiguous: true }],
    ["http-4xx", { success: false, reason: "HTTP_4XX", retryable: false, ambiguous: false }],
    ["http-5xx", { success: false, reason: "HTTP_5XX", retryable: true, ambiguous: false }],
  ] as const)("records payload/idempotency for %s", async (outcome, expected) => {
    const sender = new RecordingEmailSender(outcome);
    const request = {
      recipient: "customer@nexport.test",
      idempotencyKey: "quote-status/event-1/user-1",
      payload: { template: "quote-status", status: "QUOTED" },
    };

    await expect(sender.send(request)).resolves.toEqual(expected);
    request.payload.status = "CHANGED_AFTER_SEND";
    expect(sender.deliveries).toEqual([{
      recipient: "customer@nexport.test",
      idempotencyKey: "quote-status/event-1/user-1",
      payload: { template: "quote-status", status: "QUOTED" },
    }]);
    expect(sender.idempotencyKeys).toEqual(["quote-status/event-1/user-1"]);
  });

  it("cannot instantiate a bypass in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(() => new FixedClock(new Date())).toThrow("NODE_ENV=test");
    expect(() => new FakeCaptchaVerifier()).toThrow("NODE_ENV=test");
    expect(() => new RecordingEmailSender()).toThrow("NODE_ENV=test");
  });
});
