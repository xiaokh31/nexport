import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

function source(relativePath: string): string {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("security source boundaries", () => {
  it("contains no demo credential or dangerous OAuth email linking", () => {
    const productionSource = sourceFiles(path.resolve("src"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(productionSource).not.toContain("demo123");
    expect(productionSource).not.toContain("demo-user");
    expect(productionSource).not.toContain("allowDangerousEmailAccountLinking");
  });

  it("uses the normalized email schema for quote, login, registration, and verification resend", () => {
    const validationSource = source("src/lib/validations.ts");

    expect(validationSource.match(/email:\s*normalizedEmailSchema/g)).toHaveLength(4);
    expect(validationSource).toMatch(
      /const normalizedEmailSchema = z\.string\(\)\s*\.trim\(\)\s*\.toLowerCase\(\)/,
    );
  });

  it("keeps login-history writes inside the auth success event", () => {
    const writes = sourceFiles(path.resolve("src")).filter((file) =>
      /loginHistory\.create\s*\(/.test(readFileSync(file, "utf8")),
    );
    const routeSource = source("src/app/api/user/login-history/route.ts");

    expect(writes.map((file) => path.relative(process.cwd(), file))).toEqual([
      "src/lib/auth.ts",
    ]);
    expect(routeSource).not.toMatch(/export\s+(?:async\s+)?function\s+POST\b/);
  });

  it("uses provider discovery for the optional Google UI", () => {
    const loginFormSource = source("src/app/login/login-form.tsx");
    const serverEnvironmentSource = source("src/config/env/server.ts");

    expect(loginFormSource).toContain("getProviders()");
    expect(loginFormSource).toContain("Boolean(providers?.google)");
    expect(serverEnvironmentSource).toContain("if (!googleClientId && !googleClientSecret)");
    expect(serverEnvironmentSource).toContain("if (!googleClientId || !googleClientSecret)");
  });

  it("contains no email domain management or SendGrid shell", () => {
    const emailSource = source("src/lib/email.ts");

    expect(emailSource).not.toMatch(/\.domains\.(?:create|get|verify)\s*\(/);
    expect(emailSource).not.toMatch(/sendgrid/i);
    expect(emailSource).toContain("resend.emails.send(message)");
  });

  it("contains no client-only CAPTCHA bypass or standalone verification endpoint", () => {
    const productionSource = sourceFiles(path.resolve("src"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(productionSource).not.toContain("SimpleMathCaptcha");
    expect(productionSource).not.toContain("useCaptcha(");
    expect(productionSource).not.toContain("6LeIxAcTAAAAA");
    expect(existsSync(path.resolve("src/app/api/auth/verify-captcha/route.ts"))).toBe(false);
  });

  it("protects credentials and registration inside their business requests", () => {
    const authSource = source("src/lib/auth.ts");
    const registrationSource = source("src/app/api/auth/register/route.ts");

    expect(authSource).toContain("captchaToken: { label:");
    expect(authSource).toContain("createServerProtection(request.headers)");
    expect(registrationSource).toContain("createServerProtection(request.headers)");
    expect(registrationSource.indexOf("captchaVerifier.verify"))
      .toBeLessThan(registrationSource.indexOf("prisma.user.findUnique"));
  });

  it("uses the persistent rate-limit store without retaining raw subjects", () => {
    const storeSource = source("src/lib/security/prisma-rate-limit-store.ts");
    const rateLimitSource = source("src/lib/security/rate-limit.ts");

    expect(storeSource).toContain("client.rateLimitBucket.upsert");
    expect(storeSource).not.toMatch(/new\s+Map\s*</);
    expect(rateLimitSource).toContain('createHmac("sha256", secret)');
  });

  it("keeps quote ownership session-scoped and registration claim-free", () => {
    const quoteSource = source("src/app/api/quote/route.ts");
    const quoteSubmissionSource = source("src/lib/quote/submission.ts");
    const userQuotesSource = source("src/app/api/user/quotes/route.ts");
    const registrationSource = source("src/app/api/auth/register/route.ts");

    expect(quoteSource).toContain("sessionUserId: session?.user?.id");
    expect(quoteSubmissionSource).toContain(
      "resolveQuoteOwnership(input.sessionUserId, data.email)",
    );
    expect(userQuotesSource).toContain("ownedQuoteWhere(session.user.id)");
    expect(userQuotesSource).not.toMatch(/searchParams\.get\(["'](?:userId|email)["']\)/);
    expect(registrationSource).not.toMatch(/quote\.(?:update|updateMany)\s*\(/);
    expect(registrationSource).not.toMatch(/contact\.(?:update|updateMany)\s*\(/i);
  });
});
