import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Clock, RandomByteSource } from "@/lib/ports/external-services";
import { escapeHtml } from "@/lib/email-template";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;
const EMAIL_VERIFICATION_TOKEN_PATTERN = /^([A-Za-z0-9_-]{24})\.([a-f0-9]{64})$/;
const EMAIL_VERIFICATION_TOKEN_PLACEHOLDER = "__NEXPORT_EMAIL_VERIFICATION_TOKEN_V1__";

export type EmailVerificationLocale = "zh" | "en" | "fr";

const copy = Object.freeze({
  zh: Object.freeze({
    subject: "验证您的邮箱",
    title: "验证您的邮箱",
    body: "请确认此邮箱地址属于您，以启用账户登录。",
    action: "验证邮箱",
    expiry: "此链接将在 24 小时后失效。",
  }),
  en: Object.freeze({
    subject: "Verify your email",
    title: "Verify your email",
    body: "Confirm that this email address belongs to you to enable account login.",
    action: "Verify email",
    expiry: "This link expires in 24 hours.",
  }),
  fr: Object.freeze({
    subject: "Vérifiez votre adresse e-mail",
    title: "Vérifiez votre adresse e-mail",
    body: "Confirmez que cette adresse e-mail vous appartient pour activer la connexion.",
    action: "Vérifier l’e-mail",
    expiry: "Ce lien expire dans 24 heures.",
  }),
});

export function normalizeEmailVerificationLocale(
  locale: string | null | undefined,
): EmailVerificationLocale {
  return locale === "zh" || locale === "fr" ? locale : "en";
}

export function getEmailVerificationSubject(locale: EmailVerificationLocale) {
  return copy[locale].subject;
}

export function deriveRawEmailVerificationToken(
  verificationId: string,
  secret: string,
) {
  if (!EMAIL_VERIFICATION_ID_PATTERN.test(verificationId)) {
    throw new Error("INVALID_EMAIL_VERIFICATION_ID");
  }
  const signature = createHmac("sha256", secret)
    .update("email-verification/v1\0")
    .update(verificationId)
    .digest("hex");
  return `${verificationId}.${signature}`;
}

export function hashEmailVerificationToken(rawToken: string) {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function inspectEmailVerificationToken(rawToken: string, secret: string): {
  verificationId: string;
  tokenHash: string;
} | null {
  const match = EMAIL_VERIFICATION_TOKEN_PATTERN.exec(rawToken.trim());
  if (!match) return null;
  const [, verificationId, providedSignature] = match;
  const expectedToken = deriveRawEmailVerificationToken(verificationId, secret);
  const expectedSignature = expectedToken.slice(expectedToken.indexOf(".") + 1);
  const signatureMatches = timingSafeEqual(
    Buffer.from(providedSignature, "hex"),
    Buffer.from(expectedSignature, "hex"),
  );
  if (!signatureMatches) return null;
  return {
    verificationId,
    tokenHash: hashEmailVerificationToken(expectedToken),
  };
}

export function createEmailVerificationChallenge(input: {
  secret: string;
  randomBytes: RandomByteSource;
  clock: Clock;
}) {
  const verificationId = Buffer.from(input.randomBytes.bytes(18)).toString("base64url");
  const rawToken = deriveRawEmailVerificationToken(verificationId, input.secret);
  return {
    verificationId,
    tokenHash: hashEmailVerificationToken(rawToken),
    expiresAt: new Date(input.clock.now().getTime() + EMAIL_VERIFICATION_TTL_MS),
  };
}

export function createEmailVerificationHtmlTemplate(input: {
  siteUrl: string;
  locale: EmailVerificationLocale;
}) {
  const url = new URL("/verify-email", input.siteUrl);
  url.searchParams.set("token", EMAIL_VERIFICATION_TOKEN_PLACEHOLDER);
  const translations = copy[input.locale];
  const safeLink = escapeHtml(url.toString());
  return [
    `<h1>${escapeHtml(translations.title)}</h1>`,
    `<p>${escapeHtml(translations.body)}</p>`,
    `<p><a href="${safeLink}">${escapeHtml(translations.action)}</a></p>`,
    `<p>${escapeHtml(translations.expiry)}</p>`,
  ].join("\n");
}

export function renderEmailVerificationHtml(input: {
  htmlTemplate: string;
  verificationId: string;
  secret: string;
}) {
  if (!input.htmlTemplate.includes(EMAIL_VERIFICATION_TOKEN_PLACEHOLDER)) {
    throw new Error("INVALID_EMAIL_VERIFICATION_TEMPLATE");
  }
  return input.htmlTemplate.replaceAll(
    EMAIL_VERIFICATION_TOKEN_PLACEHOLDER,
    deriveRawEmailVerificationToken(input.verificationId, input.secret),
  );
}
