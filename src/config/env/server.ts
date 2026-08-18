import "server-only";

import {
  EnvironmentConfigurationError,
  optionalEnvironmentValue,
  requireEnvironmentValue,
  validateOrigin,
  validateSiteUrl,
} from "@/config/env/shared";
import { getDeploymentPolicy } from "@/config/deployment";
import type { ClientIpTrustPolicy } from "@/lib/security/client-ip";

const values = Object.freeze({
  databaseUrl: optionalEnvironmentValue(process.env.DATABASE_URL),
  siteUrl: optionalEnvironmentValue(process.env.NEXT_PUBLIC_SITE_URL),
  nextAuthUrl: optionalEnvironmentValue(process.env.NEXTAUTH_URL),
  nextAuthSecret: optionalEnvironmentValue(process.env.NEXTAUTH_SECRET),
  googleClientId: optionalEnvironmentValue(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: optionalEnvironmentValue(process.env.GOOGLE_CLIENT_SECRET),
  recaptchaSecretKey: optionalEnvironmentValue(
    process.env.RECAPTCHA_SECRET_KEY
  ),
  resendApiKey: optionalEnvironmentValue(process.env.RESEND_API_KEY),
  emailFrom: optionalEnvironmentValue(process.env.EMAIL_FROM),
  rateLimitSecret: optionalEnvironmentValue(process.env.RATE_LIMIT_SECRET),
  cronSecret: optionalEnvironmentValue(process.env.CRON_SECRET),
  trustedProxyHops: optionalEnvironmentValue(process.env.TRUSTED_PROXY_HOPS),
  googleSiteVerification: optionalEnvironmentValue(
    process.env.GOOGLE_SITE_VERIFICATION
  ),
  bingSiteVerification: optionalEnvironmentValue(
    process.env.BING_SITE_VERIFICATION
  ),
  baiduSiteVerification: optionalEnvironmentValue(
    process.env.BAIDU_SITE_VERIFICATION
  ),
  yandexSiteVerification: optionalEnvironmentValue(
    process.env.YANDEX_SITE_VERIFICATION
  ),
});

export const serverEnv = values;

export function getGoogleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
} | null {
  const { googleClientId, googleClientSecret } = values;

  if (!googleClientId && !googleClientSecret) {
    return null;
  }

  if (!googleClientId || !googleClientSecret) {
    throw new EnvironmentConfigurationError(
      "Google OAuth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    );
  }

  return { clientId: googleClientId, clientSecret: googleClientSecret };
}

export function requireAuthRuntimeConfig(): { secret: string; nextAuthUrl: string } {
  const secret = requireEnvironmentValue(
    "NEXTAUTH_SECRET",
    values.nextAuthSecret,
    "Authentication",
  );
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new EnvironmentConfigurationError(
      "NEXTAUTH_SECRET must contain at least 32 bytes.",
    );
  }
  const siteUrl = validateSiteUrl(values.siteUrl, process.env.NODE_ENV);
  const nextAuthUrl = validateOrigin(
    "NEXTAUTH_URL",
    values.nextAuthUrl,
    "Authentication",
    process.env.NODE_ENV,
  );
  if (nextAuthUrl !== siteUrl) {
    throw new EnvironmentConfigurationError(
      "NEXTAUTH_URL must match NEXT_PUBLIC_SITE_URL for this deployment.",
    );
  }
  return { secret, nextAuthUrl };
}

export function requireSiteRuntimeConfig(): { siteUrl: string } {
  return { siteUrl: validateSiteUrl(values.siteUrl, process.env.NODE_ENV) };
}

export function requireCaptchaRuntimeConfig(): {
  secretKey: string;
  expectedHostname: string;
} {
  const siteUrl = validateSiteUrl(values.siteUrl, process.env.NODE_ENV);

  return {
    secretKey: requireEnvironmentValue(
      "RECAPTCHA_SECRET_KEY",
      values.recaptchaSecretKey,
      "CAPTCHA verification"
    ),
    expectedHostname: new URL(siteUrl).hostname,
  };
}

export function requireEmailRuntimeConfig(): {
  apiKey: string;
  from: string;
} {
  return {
    apiKey: requireEnvironmentValue(
      "RESEND_API_KEY",
      values.resendApiKey,
      "Email delivery"
    ),
    from: requireEnvironmentValue(
      "EMAIL_FROM",
      values.emailFrom,
      "Email delivery"
    ),
  };
}

export function requireRateLimitRuntimeConfig(): {
  secret: string;
  clientIpPolicy: ClientIpTrustPolicy;
} {
  const secret = requireEnvironmentValue(
    "RATE_LIMIT_SECRET",
    values.rateLimitSecret,
    "Rate limiting"
  );

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new EnvironmentConfigurationError(
      "RATE_LIMIT_SECRET must contain at least 32 bytes."
    );
  }

  return { secret, clientIpPolicy: getClientIpTrustPolicy() };
}

export function requireCronRuntimeConfig(): { secret: string } {
  const secret = requireEnvironmentValue(
    "CRON_SECRET",
    values.cronSecret,
    "Email outbox worker",
  );

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new EnvironmentConfigurationError(
      "CRON_SECRET must contain at least 32 bytes.",
    );
  }

  return { secret };
}

export function getTrustedProxyHops(): number {
  const rawTrustedProxyHops = values.trustedProxyHops ?? "0";
  const trustedProxyHops = Number(rawTrustedProxyHops);

  if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops < 0) {
    throw new EnvironmentConfigurationError(
      "TRUSTED_PROXY_HOPS must be a non-negative integer."
    );
  }

  return trustedProxyHops;
}

export function getClientIpTrustPolicy(): ClientIpTrustPolicy {
  if (getDeploymentPolicy().isVercelRuntime) {
    return { source: "vercel" };
  }

  const trustedProxyHops = getTrustedProxyHops();
  if (process.env.NODE_ENV === "production" && trustedProxyHops === 0) {
    throw new EnvironmentConfigurationError(
      "Production outside Vercel requires an explicitly verified TRUSTED_PROXY_HOPS value.",
    );
  }
  return { source: "trusted-proxy", trustedProxyHops };
}
