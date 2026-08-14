import {
  optionalEnvironmentValue,
  validateSiteUrl,
} from "@/config/env/shared";

/**
 * Values in this object are safe to include in browser bundles.
 * NEXT_PUBLIC_SITE_URL is a build-time requirement because metadata and URL
 * generation depend on it. Optional browser providers remain disabled when
 * their public key is absent.
 */
export const publicEnv = Object.freeze({
  siteUrl: validateSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV
  ),
  recaptchaSiteKey: optionalEnvironmentValue(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  ),
});
