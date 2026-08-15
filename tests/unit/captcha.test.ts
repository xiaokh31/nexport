import { describe, expect, it, vi } from "vitest";
import { createGoogleCaptchaVerifier } from "../../src/lib/security/captcha";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type CaptchaFetcher = NonNullable<
  Parameters<typeof createGoogleCaptchaVerifier>[0]["fetcher"]
>;

function verifier(fetcher: CaptchaFetcher, timeoutMs = 100) {
  return createGoogleCaptchaVerifier({
    secretKey: "test-secret",
    expectedHostname: "www.example.com",
    fetcher,
    timeoutMs,
  });
}

describe("server CAPTCHA verifier", () => {
  it("rejects a missing token without calling the provider", async () => {
    const fetcher = vi.fn();

    await expect(verifier(fetcher).verify({ token: "  " })).resolves.toEqual({
      success: false,
      reason: "MISSING",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [{ success: false, "error-codes": ["invalid-input-response"] }, "REJECTED"],
    [{ success: false, "error-codes": ["timeout-or-duplicate"] }, "EXPIRED_OR_REPLAYED"],
    [{ success: false, "error-codes": ["invalid-input-secret"] }, "UNAVAILABLE"],
  ] as const)("maps provider rejection %j to %s", async (body, reason) => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(body));

    await expect(verifier(fetcher).verify({ token: "provider-token" })).resolves.toEqual({
      success: false,
      reason,
    });
  });

  it("validates hostname and action on successful responses", async () => {
    const hostnameMismatch = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      hostname: "attacker.example",
      action: "login",
    }));
    const actionMismatch = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      hostname: "www.example.com",
      action: "register",
    }));

    await expect(verifier(hostnameMismatch).verify({
      token: "provider-token",
      expectedAction: "login",
    })).resolves.toEqual({ success: false, reason: "HOSTNAME_MISMATCH" });
    await expect(verifier(actionMismatch).verify({
      token: "provider-token",
      expectedAction: "login",
    })).resolves.toEqual({ success: false, reason: "ACTION_MISMATCH" });
  });

  it("returns a successful verified result and sends the trusted remote IP", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      hostname: "www.example.com",
      action: "login",
      score: 0.9,
    }));

    await expect(verifier(fetcher).verify({
      token: "provider-token",
      expectedAction: "login",
      remoteIp: "203.0.113.10",
    })).resolves.toEqual({
      success: true,
      hostname: "www.example.com",
      action: "login",
      score: 0.9,
    });

    const request = fetcher.mock.calls[0][1];
    expect(request?.body).toBeInstanceOf(URLSearchParams);
    expect((request?.body as URLSearchParams).get("remoteip")).toBe("203.0.113.10");
  });

  it("fails closed on HTTP errors, exceptions, and timeouts", async () => {
    const httpFailure = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    const exception = vi.fn().mockRejectedValue(new Error("network down"));
    const neverCompletes = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));

    await expect(verifier(httpFailure).verify({ token: "token" })).resolves.toEqual({
      success: false,
      reason: "UNAVAILABLE",
    });
    await expect(verifier(exception).verify({ token: "token" })).resolves.toEqual({
      success: false,
      reason: "UNAVAILABLE",
    });
    await expect(verifier(neverCompletes, 1).verify({ token: "token" })).resolves.toEqual({
      success: false,
      reason: "TIMEOUT",
    });
  });
});
