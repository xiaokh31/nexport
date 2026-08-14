import "server-only";

import {
  EnvironmentConfigurationError,
  optionalEnvironmentValue,
  requireEnvironmentValue,
} from "@/config/env/shared";

const values = Object.freeze({
  databaseUrl: optionalEnvironmentValue(process.env.DATABASE_URL),
  nextAuthSecret: optionalEnvironmentValue(process.env.NEXTAUTH_SECRET),
  googleClientId: optionalEnvironmentValue(process.env.GOOGLE_CLIENT_ID),
  googleClientSecret: optionalEnvironmentValue(process.env.GOOGLE_CLIENT_SECRET),
  recaptchaSecretKey: optionalEnvironmentValue(
    process.env.RECAPTCHA_SECRET_KEY
  ),
  resendApiKey: optionalEnvironmentValue(process.env.RESEND_API_KEY),
  emailFrom: optionalEnvironmentValue(process.env.EMAIL_FROM),
  emailTo: optionalEnvironmentValue(process.env.EMAIL_TO),
  rateLimitSecret: optionalEnvironmentValue(process.env.RATE_LIMIT_SECRET),
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

export function requireAuthRuntimeConfig(): { secret: string } {
  return {
    secret: requireEnvironmentValue(
      "NEXTAUTH_SECRET",
      values.nextAuthSecret,
      "Authentication"
    ),
  };
}

export function requireCaptchaRuntimeConfig(): { secretKey: string } {
  return {
    secretKey: requireEnvironmentValue(
      "RECAPTCHA_SECRET_KEY",
      values.recaptchaSecretKey,
      "CAPTCHA verification"
    ),
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
  trustedProxyHops: number;
} {
  const secret = requireEnvironmentValue(
    "RATE_LIMIT_SECRET",
    values.rateLimitSecret,
    "Rate limiting"
  );
  const rawTrustedProxyHops = values.trustedProxyHops ?? "0";
  const trustedProxyHops = Number(rawTrustedProxyHops);

  if (!Number.isSafeInteger(trustedProxyHops) || trustedProxyHops < 0) {
    throw new EnvironmentConfigurationError(
      "TRUSTED_PROXY_HOPS must be a non-negative integer."
    );
  }

  return { secret, trustedProxyHops };
}
