import { describe, expect, it, vi } from "vitest";
import {
  authenticateCredentials,
  INVALID_CREDENTIALS_MESSAGE,
  type CredentialUser,
} from "../../src/lib/auth/credentials";

const storedUser: CredentialUser = {
  id: "user-1",
  email: "customer@example.com",
  name: "Customer",
  role: "CUSTOMER",
  canManageArticles: false,
  password: "stored-password-hash",
  emailVerified: new Date("2026-01-01T00:00:00.000Z"),
};

function securityDependencies() {
  return {
    clientIp: "203.0.113.10",
    captchaVerifier: {
      verify: vi.fn().mockResolvedValue({ success: true as const }),
    },
    rateLimiter: {
      consume: vi.fn().mockResolvedValue({
        allowed: true as const,
        remaining: 9,
        resetAt: new Date("2026-08-14T10:15:00.000Z"),
      }),
    },
  };
}

describe("credential authentication", () => {
  it("normalizes email before lookup and returns no password material", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(storedUser);
    const verifyPassword = vi.fn().mockResolvedValue(true);

    await expect(authenticateCredentials(
      {
        email: "  CUSTOMER@EXAMPLE.COM ",
        password: "valid-password",
        captchaToken: "valid-captcha-token",
      },
      { ...securityDependencies(), findUserByEmail, verifyPassword },
    )).resolves.toEqual({
      id: "user-1",
      email: "customer@example.com",
      name: "Customer",
      role: "CUSTOMER",
      canManageArticles: false,
    });

    expect(findUserByEmail).toHaveBeenCalledWith("customer@example.com");
    expect(verifyPassword).toHaveBeenCalledWith(
      "valid-password",
      "stored-password-hash",
    );
  });

  it("uses the same error for an unknown account and an invalid password", async () => {
    await expect(authenticateCredentials(
      { email: "missing@example.com", password: "invalid-password" },
      {
        ...securityDependencies(),
        findUserByEmail: vi.fn().mockResolvedValue(null),
        verifyPassword: vi.fn().mockResolvedValue(false),
      },
    )).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);

    await expect(authenticateCredentials(
      { email: storedUser.email, password: "invalid-password" },
      {
        ...securityDependencies(),
        findUserByEmail: vi.fn().mockResolvedValue(storedUser),
        verifyPassword: vi.fn().mockResolvedValue(false),
      },
    )).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it("rejects a correct password until the credentials email is verified", async () => {
    await expect(authenticateCredentials(
      {
        email: storedUser.email,
        password: "valid-password",
        captchaToken: "valid-captcha-token",
      },
      {
        ...securityDependencies(),
        findUserByEmail: vi.fn().mockResolvedValue({
          ...storedUser,
          emailVerified: null,
        }),
        verifyPassword: vi.fn().mockResolvedValue(true),
      },
    )).rejects.toThrow("请先验证邮箱");
  });

  it("rejects the removed demo credentials when no database user exists", async () => {
    const verifyPassword = vi.fn().mockResolvedValue(false);

    await expect(authenticateCredentials(
      {
        email: "demo@example.com",
        password: "demo123",
        captchaToken: "valid-captcha-token",
      },
      {
        ...securityDependencies(),
        findUserByEmail: vi.fn().mockResolvedValue(null),
        verifyPassword,
      },
    )).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);

    expect(verifyPassword).toHaveBeenCalledOnce();
    expect(verifyPassword).toHaveBeenCalledWith(
      "demo123",
      expect.stringMatching(/^\$2[aby]\$10\$/),
    );
  });

  it("rejects failed CAPTCHA before querying credentials", async () => {
    const findUserByEmail = vi.fn();
    const verifyPassword = vi.fn();

    await expect(authenticateCredentials(
      {
        email: storedUser.email,
        password: "valid-password",
        captchaToken: "forged-token",
      },
      {
        ...securityDependencies(),
        captchaVerifier: {
          verify: vi.fn().mockResolvedValue({
            success: false as const,
            reason: "REJECTED" as const,
          }),
        },
        findUserByEmail,
        verifyPassword,
      },
    )).rejects.toThrow("人机验证失败");

    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("rejects a rate-limited request before CAPTCHA and password work", async () => {
    const captchaVerifier = { verify: vi.fn() };
    const findUserByEmail = vi.fn();
    const verifyPassword = vi.fn();

    await expect(authenticateCredentials(
      {
        email: storedUser.email,
        password: "valid-password",
        captchaToken: "provider-token",
      },
      {
        ...securityDependencies(),
        rateLimiter: {
          consume: vi.fn().mockResolvedValue({
            allowed: false as const,
            retryAfterSeconds: 60,
            resetAt: new Date("2026-08-14T10:15:00.000Z"),
          }),
        },
        captchaVerifier,
        findUserByEmail,
        verifyPassword,
      },
    )).rejects.toThrow("登录尝试过于频繁");

    expect(captchaVerifier.verify).not.toHaveBeenCalled();
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(verifyPassword).not.toHaveBeenCalled();
  });
});
