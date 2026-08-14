import { readdirSync, readFileSync } from "node:fs";
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

describe("SEC-001 source boundaries", () => {
  it("contains no demo credential or dangerous OAuth email linking", () => {
    const productionSource = sourceFiles(path.resolve("src"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(productionSource).not.toContain("demo123");
    expect(productionSource).not.toContain("demo-user");
    expect(productionSource).not.toContain("allowDangerousEmailAccountLinking");
  });

  it("uses the normalized email schema for quote, login, and registration", () => {
    const validationSource = source("src/lib/validations.ts");

    expect(validationSource.match(/email:\s*normalizedEmailSchema/g)).toHaveLength(3);
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
});
