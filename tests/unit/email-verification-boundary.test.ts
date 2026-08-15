import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe("email verification source boundaries", () => {
  it("creates the user, hashed challenge, and required outbox in one registration transaction", () => {
    const registration = source("src/app/api/auth/register/route.ts");

    expect(registration).toContain("prisma.$transaction(async (transaction)");
    expect(registration).toContain("transaction.user.create");
    expect(registration).toContain("issueEmailVerification(transaction");
    expect(registration).not.toMatch(/sendEmail|emails\.send|new Resend/);
  });

  it("keeps token signing and provider delivery out of public API routes", () => {
    const tokenService = source("src/lib/auth/email-verification-token.ts");
    const outboxPayload = source("src/lib/notifications/outbox-payload.ts");
    const verificationApi = source("src/app/api/auth/verify-email/route.ts");

    expect(tokenService).toContain('createHmac("sha256", secret)');
    expect(tokenService).toContain("hashEmailVerificationToken");
    expect(outboxPayload).toContain('kind: z.literal("EMAIL_VERIFICATION")');
    expect(verificationApi).toMatch(/export async function POST/);
    expect(verificationApi).not.toMatch(/export async function GET/);
  });

  it("allows only the server verification service to set emailVerified", () => {
    const writers = sourceFiles(path.resolve("src")).filter((file) =>
      /data:\s*\{\s*emailVerified:\s*(?!null)/.test(readFileSync(file, "utf8")),
    );

    expect(writers.map((file) => path.relative(process.cwd(), file))).toEqual([
      "src/lib/auth/email-verification-service.ts",
    ]);
  });

  it("blocks unverified credentials and rate-limits generic resend requests", () => {
    const credentials = source("src/lib/auth/credentials.ts");
    const resendRoute = source("src/app/api/auth/resend-verification/route.ts");

    expect(credentials).toContain("if (!user.emailVerified)");
    expect(resendRoute).toContain("RATE_LIMIT_POLICIES.resendVerification");
    expect(resendRoute).toContain("emailRateLimitSubject(input.email)");
    expect(resendRoute).toContain("acceptedMessage");
  });
});
