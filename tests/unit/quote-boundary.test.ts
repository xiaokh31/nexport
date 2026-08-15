import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("quote source boundaries", () => {
  it("protects public submission with both persistent limits and server CAPTCHA", () => {
    const route = source("src/app/api/quote/route.ts");

    expect(route).toContain("createServerProtection(request.headers)");
    expect(route).toContain("RATE_LIMIT_POLICIES.quoteByIp");
    expect(route).toContain("RATE_LIMIT_POLICIES.quoteByEmail");
    expect(route).toContain("captchaVerifier.verify");
    expect(route.indexOf("captchaVerifier.verify")).toBeLessThan(
      route.indexOf("submitQuote(prisma"),
    );
    expect(route).not.toMatch(/new Resend|emails\.send|sendEmail/);
  });

  it("keeps a stable submission key and resets only CAPTCHA on recoverable failure", () => {
    const form = source("src/components/forms/quote-form.tsx");

    expect(form).toContain("crypto.randomUUID()");
    expect(form).toContain("CaptchaV2Checkbox");
    expect(form).toContain("fieldErrors");
    expect(form).toContain("form.setFocus");
    expect(form).toContain('get("service")');
    expect(form).toContain("setCaptchaResetKey");
  });

  it("serializes status changes with a row lock and creates notification artifacts in-transaction", () => {
    const service = source("src/lib/quote/admin-service.ts");

    expect(service).toContain('FROM "Quote"');
    expect(service).toContain("FOR UPDATE");
    expect(service).toContain("transaction.quoteEvent.create");
    expect(service).toContain("createQuoteEventNotifications(transaction");
    expect(service).toContain('toStatus: "PROCESSING"');
  });

  it("whitelists admin output and never exposes internal notes or draft prices to customers", () => {
    const adminRoute = source("src/app/api/admin/quotes/route.ts");
    const userRoute = source("src/app/api/user/quotes/route.ts");

    expect(adminRoute).toContain("select: adminQuoteSelect");
    expect(adminRoute).not.toContain("submissionFingerprint: true");
    expect(adminRoute).not.toContain("submissionKey: true");
    expect(userRoute).not.toContain("internalNote: true");
    expect(userRoute).toContain("publishedQuoteVisible");
    expect(userRoute).toContain("customerNote: publishedQuoteVisible");
  });
});
