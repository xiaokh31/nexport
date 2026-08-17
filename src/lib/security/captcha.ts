import type {
  CaptchaVerificationResult,
  CaptchaVerifier,
} from "@/lib/ports/external-services";

const GOOGLE_SITE_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type CaptchaFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

interface GoogleCaptchaVerifierOptions {
  secretKey: string;
  expectedHostname: string;
  fetcher?: CaptchaFetch;
  timeoutMs?: number;
}

interface GoogleCaptchaResponse {
  success?: unknown;
  score?: unknown;
  action?: unknown;
  hostname?: unknown;
  "error-codes"?: unknown;
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function rejectedResult(data: GoogleCaptchaResponse): CaptchaVerificationResult {
  const errorCodes = Array.isArray(data["error-codes"])
    ? data["error-codes"].filter((value): value is string => typeof value === "string")
    : [];

  if (errorCodes.some((code) => code === "missing-input-secret" || code === "invalid-input-secret")) {
    return { success: false, reason: "UNAVAILABLE" };
  }
  if (errorCodes.includes("timeout-or-duplicate")) {
    return { success: false, reason: "EXPIRED_OR_REPLAYED" };
  }
  return { success: false, reason: "REJECTED" };
}

export function createGoogleCaptchaVerifier({
  secretKey,
  expectedHostname,
  fetcher = fetch,
  timeoutMs = 5_000,
}: GoogleCaptchaVerifierOptions): CaptchaVerifier {
  const normalizedExpectedHostname = normalizeHostname(expectedHostname);

  return Object.freeze<CaptchaVerifier>({
    async verify(request) {
      const token = request.token?.trim();
      if (!token) {
        return { success: false, reason: "MISSING" };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const body = new URLSearchParams({
          secret: secretKey,
          response: token,
        });
        if (request.remoteIp) body.set("remoteip", request.remoteIp);

        const response = await fetcher(GOOGLE_SITE_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
          signal: controller.signal,
        });

        if (!response.ok) {
          return { success: false, reason: "UNAVAILABLE" };
        }

        const data = await response.json() as GoogleCaptchaResponse;
        if (data.success !== true) {
          return rejectedResult(data);
        }

        if (
          typeof data.hostname !== "string" ||
          normalizeHostname(data.hostname) !== normalizedExpectedHostname
        ) {
          return { success: false, reason: "HOSTNAME_MISMATCH" };
        }

        if (
          request.expectedAction &&
          (typeof data.action !== "string" || data.action !== request.expectedAction)
        ) {
          return { success: false, reason: "ACTION_MISMATCH" };
        }

        return {
          success: true,
          ...(typeof data.score === "number" ? { score: data.score } : {}),
          ...(typeof data.action === "string" ? { action: data.action } : {}),
          hostname: data.hostname,
        };
      } catch {
        return {
          success: false,
          reason: controller.signal.aborted ? "TIMEOUT" : "UNAVAILABLE",
        };
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
