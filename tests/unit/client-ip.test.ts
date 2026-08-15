import { describe, expect, it } from "vitest";
import { resolveTrustedClientIp } from "../../src/lib/security/client-ip";

describe("trusted client IP resolution", () => {
  it("ignores spoofable forwarding headers when no proxy hop is trusted", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "203.0.113.11",
      "cf-connecting-ip": "203.0.113.12",
    });

    expect(resolveTrustedClientIp(headers, 0)).toBeNull();
  });

  it("selects the client from the right side of the trusted proxy chain", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.99, 203.0.113.10, 192.0.2.20",
    });

    expect(resolveTrustedClientIp(headers, 1)).toBe("192.0.2.20");
    expect(resolveTrustedClientIp(headers, 2)).toBe("203.0.113.10");
    expect(resolveTrustedClientIp(headers, 3)).toBe("198.51.100.99");
    expect(resolveTrustedClientIp(headers, 4)).toBeNull();
  });

  it("rejects malformed addresses and accepts a one-hop real-IP fallback", () => {
    expect(resolveTrustedClientIp(
      new Headers({ "x-forwarded-for": "not-an-ip" }),
      1,
    )).toBeNull();
    expect(resolveTrustedClientIp(
      new Headers({ "x-real-ip": "203.0.113.10:443" }),
      1,
    )).toBe("203.0.113.10");
  });
});
