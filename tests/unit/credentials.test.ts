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
};

describe("credential authentication", () => {
  it("normalizes email before lookup and returns no password material", async () => {
    const findUserByEmail = vi.fn().mockResolvedValue(storedUser);
    const verifyPassword = vi.fn().mockResolvedValue(true);

    await expect(authenticateCredentials(
      { email: "  CUSTOMER@EXAMPLE.COM ", password: "valid-password" },
      { findUserByEmail, verifyPassword },
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
        findUserByEmail: vi.fn().mockResolvedValue(null),
        verifyPassword: vi.fn().mockResolvedValue(false),
      },
    )).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);

    await expect(authenticateCredentials(
      { email: storedUser.email, password: "invalid-password" },
      {
        findUserByEmail: vi.fn().mockResolvedValue(storedUser),
        verifyPassword: vi.fn().mockResolvedValue(false),
      },
    )).rejects.toThrow(INVALID_CREDENTIALS_MESSAGE);
  });

  it("rejects the removed demo credentials when no database user exists", async () => {
    const verifyPassword = vi.fn().mockResolvedValue(false);

    await expect(authenticateCredentials(
      { email: "demo@example.com", password: "demo123" },
      {
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
});
