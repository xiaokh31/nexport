import { describe, expect, it, vi } from "vitest";
import type {
  ClaimedEmailOutbox,
  EmailOutboxStore,
} from "../../src/lib/notifications/outbox-worker";
import {
  EMAIL_PROVIDER_IDEMPOTENCY_WINDOW_MS,
  processEmailOutbox,
} from "../../src/lib/notifications/outbox-worker";
import { FixedClock, RecordingEmailSender } from "../support/doubles";

const payload = {
  version: 1 as const,
  kind: "QUOTE_STATUS" as const,
  from: "Nexport <notifications@example.com>",
  subject: "Quote updated",
  html: "<p>Updated</p>",
};

function claimed(overrides: Partial<ClaimedEmailOutbox> = {}): ClaimedEmailOutbox {
  return {
    id: "outbox-1",
    eventKey: "quote-event/event-1",
    recipient: "customer@example.com",
    payload,
    idempotencyKey: "email/v1/stable-key",
    attemptCount: 1,
    firstAttemptAt: new Date("2026-08-14T00:00:00.000Z"),
    lockedAt: new Date("2026-08-14T00:00:00.000Z"),
    lastError: null,
    recoveredFromExpiredLease: false,
    ...overrides,
  };
}

class RecordingStore implements EmailOutboxStore {
  readonly calls: Array<{ method: string; input: unknown }> = [];

  constructor(private readonly records: ClaimedEmailOutbox[]) {}

  async claimBatch(input: { now: Date; leaseMs: number; limit: number }) {
    this.calls.push({ method: "claimBatch", input });
    return this.records;
  }

  async markSent(input: Parameters<EmailOutboxStore["markSent"]>[0]) {
    this.calls.push({ method: "markSent", input });
    return true;
  }

  async markRetry(input: Parameters<EmailOutboxStore["markRetry"]>[0]) {
    this.calls.push({ method: "markRetry", input });
    return true;
  }

  async markFailed(input: Parameters<EmailOutboxStore["markFailed"]>[0]) {
    this.calls.push({ method: "markFailed", input });
    return true;
  }

  async markManualReview(input: Parameters<EmailOutboxStore["markManualReview"]>[0]) {
    this.calls.push({ method: "markManualReview", input });
    return true;
  }
}

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

describe("email outbox worker", () => {
  it("records provider message IDs after successful delivery", async () => {
    const store = new RecordingStore([claimed()]);
    const sender = new RecordingEmailSender("success");

    await expect(processEmailOutbox({
      store,
      sender,
      clock: new FixedClock("2026-08-14T00:01:00.000Z"),
      logger,
    })).resolves.toMatchObject({ claimed: 1, sent: 1 });

    expect(store.calls.find((call) => call.method === "markSent")?.input)
      .toMatchObject({ providerMessageId: "fake-message-1" });
  });

  it("retries ambiguous delivery with the exact same payload and idempotency key", async () => {
    const sender = new RecordingEmailSender("timeout");
    const firstStore = new RecordingStore([claimed()]);
    await processEmailOutbox({
      store: firstStore,
      sender,
      clock: new FixedClock("2026-08-14T00:01:00.000Z"),
      logger,
    });
    const retryStore = new RecordingStore([claimed({
      attemptCount: 2,
      lockedAt: new Date("2026-08-14T00:03:00.000Z"),
      lastError: "AMBIGUOUS:TIMEOUT:RETRYABLE",
    })]);
    await processEmailOutbox({
      store: retryStore,
      sender,
      clock: new FixedClock("2026-08-14T00:03:00.000Z"),
      logger,
    });

    expect(sender.deliveries).toHaveLength(2);
    expect(sender.deliveries[1]).toEqual(sender.deliveries[0]);
    expect(firstStore.calls.some((call) => call.method === "markRetry")).toBe(true);
  });

  it("treats an expired lease as ambiguous and stops after the provider window", async () => {
    const store = new RecordingStore([claimed({
      firstAttemptAt: new Date("2026-08-13T00:00:00.000Z"),
      recoveredFromExpiredLease: true,
    })]);
    const sender = new RecordingEmailSender("success");
    const clock = new FixedClock(new Date(
      new Date("2026-08-13T00:00:00.000Z").getTime() +
      EMAIL_PROVIDER_IDEMPOTENCY_WINDOW_MS,
    ));

    await expect(processEmailOutbox({ store, sender, clock, logger }))
      .resolves.toMatchObject({ manualReview: 1, sent: 0 });
    expect(sender.deliveries).toHaveLength(0);
    expect(store.calls.some((call) => call.method === "markManualReview")).toBe(true);
  });

  it("marks a permanent provider rejection as failed", async () => {
    const store = new RecordingStore([claimed()]);
    const sender = new RecordingEmailSender("http-4xx");

    await expect(processEmailOutbox({
      store,
      sender,
      clock: new FixedClock("2026-08-14T00:01:00.000Z"),
      logger,
    })).resolves.toMatchObject({ failed: 1, retried: 0 });
    expect(store.calls.some((call) => call.method === "markFailed")).toBe(true);
  });
});
