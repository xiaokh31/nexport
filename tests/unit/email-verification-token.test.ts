import { describe, expect, it } from "vitest";
import {
  createEmailVerificationChallenge,
  createEmailVerificationHtmlTemplate,
  deriveRawEmailVerificationToken,
  inspectEmailVerificationToken,
  renderEmailVerificationHtml,
} from "../../src/lib/auth/email-verification-token";
import { FakeRandomByteSource, FixedClock } from "../support/doubles";

const secret = "auth-test-secret-with-at-least-32-bytes";

describe("email verification token", () => {
  it("stores a hash while keeping the replayable token derivable only with the secret", () => {
    const challenge = createEmailVerificationChallenge({
      secret,
      randomBytes: new FakeRandomByteSource([new Array(18).fill(7)]),
      clock: new FixedClock("2026-08-14T00:00:00.000Z"),
    });
    const rawToken = deriveRawEmailVerificationToken(challenge.verificationId, secret);

    expect(challenge).not.toHaveProperty("rawToken");
    expect(challenge.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(challenge.tokenHash).not.toBe(rawToken);
    expect(inspectEmailVerificationToken(rawToken, secret)).toEqual({
      verificationId: challenge.verificationId,
      tokenHash: challenge.tokenHash,
    });
    expect(inspectEmailVerificationToken(rawToken, `${secret}-wrong`)).toBeNull();
  });

  it("rejects malformed and tampered tokens", () => {
    const verificationId = Buffer.alloc(18, 9).toString("base64url");
    const rawToken = deriveRawEmailVerificationToken(verificationId, secret);
    const tampered = `${rawToken.slice(0, -1)}${rawToken.endsWith("0") ? "1" : "0"}`;

    expect(inspectEmailVerificationToken("not-a-token", secret)).toBeNull();
    expect(inspectEmailVerificationToken(tampered, secret)).toBeNull();
  });

  it("persists a token-free template and renders the stable secure link in memory", () => {
    const verificationId = Buffer.alloc(18, 3).toString("base64url");
    const rawToken = deriveRawEmailVerificationToken(verificationId, secret);
    const htmlTemplate = createEmailVerificationHtmlTemplate({
      siteUrl: "https://www.example.com",
      locale: "en",
    });
    const html = renderEmailVerificationHtml({ htmlTemplate, verificationId, secret });

    expect(htmlTemplate).not.toContain(rawToken);
    expect(html).toContain(`https://www.example.com/verify-email?token=${rawToken}`);
    expect(renderEmailVerificationHtml({ htmlTemplate, verificationId, secret })).toBe(html);
  });
});
