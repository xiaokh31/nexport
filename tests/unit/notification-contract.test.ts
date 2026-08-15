import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBroadcastFingerprint,
  createEmailIdempotencyKey,
} from "../../src/lib/notifications/idempotency";
import { normalizeNotificationLink } from "../../src/lib/notifications/link";
import { classifyResendError } from "../../src/lib/notifications/resend-email-sender";
import {
  notificationBroadcastSchema,
  notificationListQuerySchema,
} from "../../src/lib/notifications/validation";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("notification domain contract", () => {
  it("accepts only normalized root-relative links", () => {
    expect(normalizeNotificationLink(" /user/quotes?q=1#latest "))
      .toBe("/user/quotes?q=1#latest");
    expect(normalizeNotificationLink("https://attacker.example/path")).toBeNull();
    expect(normalizeNotificationLink("//attacker.example/path")).toBeNull();
    expect(normalizeNotificationLink("/\\attacker.example/path")).toBeNull();
    expect(normalizeNotificationLink("/safe\nunsafe")).toBeNull();
  });

  it("derives stable bounded email keys from event and normalized recipient", () => {
    const first = createEmailIdempotencyKey("quote-event/event-1", "USER@EXAMPLE.COM");
    const retry = createEmailIdempotencyKey("quote-event/event-1", " user@example.com ");
    const differentEvent = createEmailIdempotencyKey("quote-event/event-2", "user@example.com");

    expect(first).toBe(retry);
    expect(first).not.toBe(differentEvent);
    expect(first.length).toBeLessThanOrEqual(256);
  });

  it("fingerprints the complete canonical broadcast payload", () => {
    const input = {
      targetScope: "USER" as const,
      targetUserId: "user-1",
      type: "SYSTEM",
      title: "Title",
      content: "Content",
      link: "/user/notifications",
    };
    expect(createBroadcastFingerprint(input)).toBe(createBroadcastFingerprint({ ...input }));
    expect(createBroadcastFingerprint(input)).not.toBe(createBroadcastFingerprint({
      ...input,
      content: "Changed",
    }));
  });

  it("caps pagination and validates broadcast type, target, UUID, and link", () => {
    expect(notificationListQuerySchema.parse({ limit: "100" }).limit).toBe(100);
    expect(() => notificationListQuerySchema.parse({ limit: "101" })).toThrow();
    expect(() => notificationBroadcastSchema.parse({
      requestKey: "not-a-uuid",
      sendToAll: true,
      type: "UNKNOWN",
      title: "Title",
      content: "Content",
      link: "https://attacker.example",
    })).toThrow();
    expect(notificationBroadcastSchema.parse({
      requestKey: "00000000-0000-4000-8000-000000000001",
      sendToAll: true,
      type: "SYSTEM",
      title: "Title",
      content: "Content",
      link: "/user/notifications",
    })).toMatchObject({ sendToAll: true, type: "SYSTEM" });
  });

  it("retries Resend capacity and concurrent-idempotency errors only when safe", () => {
    expect(classifyResendError({ name: "rate_limit_exceeded", statusCode: 429 }))
      .toMatchObject({ success: false, retryable: true, ambiguous: false });
    expect(classifyResendError({ name: "internal_server_error", statusCode: 500 }))
      .toMatchObject({ success: false, retryable: true, ambiguous: false });
    expect(classifyResendError({ name: "concurrent_idempotent_requests", statusCode: 409 }))
      .toMatchObject({ success: false, retryable: true, ambiguous: true });
    expect(classifyResendError({ name: "invalid_idempotent_request", statusCode: 409 }))
      .toMatchObject({ success: false, retryable: false, ambiguous: false });
  });

  it("keeps provider delivery outside business routes and centralizes quote production", () => {
    const quoteRoute = source("src/app/api/quote/route.ts");
    const adminQuoteRoute = source("src/app/api/admin/quotes/route.ts");
    const quoteWorkflow = source("src/lib/quote/admin-service.ts");
    const cronRoute = source("src/app/api/cron/email-outbox/route.ts");
    const adminPage = source("src/app/admin/messages/page.tsx");

    expect(quoteRoute).not.toMatch(/sendEmail|emails\.send|Resend/);
    expect(adminQuoteRoute).toContain("updateQuoteWorkflow(prisma");
    expect(quoteWorkflow).toContain("createQuoteEventNotifications(transaction");
    expect(cronRoute).toContain("requireCronRuntimeConfig");
    expect(cronRoute).toContain("processEmailOutbox");
    expect(adminPage).toContain("通知管理");
    expect(adminPage).toContain("crypto.randomUUID()");
  });
});
