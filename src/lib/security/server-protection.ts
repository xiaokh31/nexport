import "server-only";

import { prisma } from "@/lib/prisma";
import {
  requireCaptchaRuntimeConfig,
  requireRateLimitRuntimeConfig,
} from "@/config/env/server";
import type { CaptchaVerifier } from "@/lib/ports/external-services";
import { systemClock } from "@/lib/ports/external-services";
import { createGoogleCaptchaVerifier } from "@/lib/security/captcha";
import {
  createRateLimiter,
} from "@/lib/security/rate-limit";
import { createPrismaRateLimitStore } from "@/lib/security/prisma-rate-limit-store";
import {
  resolveTrustedClientIp,
  type HeaderSource,
} from "@/lib/security/client-ip";

const prismaRateLimitStore = createPrismaRateLimitStore(prisma);

const serverCaptchaVerifier = Object.freeze<CaptchaVerifier>({
  async verify(request) {
    if (!request.token?.trim()) {
      return { success: false, reason: "MISSING" };
    }

    try {
      const config = requireCaptchaRuntimeConfig();
      return createGoogleCaptchaVerifier(config).verify(request);
    } catch {
      return { success: false, reason: "UNAVAILABLE" };
    }
  },
});

export function createServerProtection(headers: HeaderSource) {
  const rateLimitConfig = requireRateLimitRuntimeConfig();

  return {
    captchaVerifier: serverCaptchaVerifier,
    rateLimiter: createRateLimiter({
      store: prismaRateLimitStore,
      secret: rateLimitConfig.secret,
      clock: systemClock,
    }),
    clientIp: resolveTrustedClientIp(headers, rateLimitConfig.trustedProxyHops),
  };
}
