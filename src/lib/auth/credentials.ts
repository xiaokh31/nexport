import type { CaptchaVerifier } from "@/lib/ports/external-services";
import {
  clientIpRateLimitSubject,
  emailRateLimitSubject,
  RATE_LIMIT_POLICIES,
  type RateLimiter,
} from "@/lib/security/rate-limit";

export const INVALID_CREDENTIALS_MESSAGE = "邮箱或密码错误";
export const CAPTCHA_REQUIRED_MESSAGE = "请先完成人机验证";
export const CAPTCHA_REJECTED_MESSAGE = "人机验证失败，请重新验证";
export const AUTH_PROTECTION_UNAVAILABLE_MESSAGE = "安全验证服务未配置或暂不可用";
export const CREDENTIALS_RATE_LIMITED_MESSAGE = "登录尝试过于频繁，请稍后再试";

// A fixed non-user hash keeps unknown-account checks on the same bcrypt path.
const DUMMY_PASSWORD_HASH =
  "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.";

export interface CredentialUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  canManageArticles: boolean;
  password: string | null;
}

interface CredentialDependencies {
  findUserByEmail(email: string): Promise<CredentialUser | null>;
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  captchaVerifier: CaptchaVerifier;
  rateLimiter: RateLimiter;
  clientIp: string | null;
}

type CredentialInput = Record<string, unknown> | null | undefined;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function authenticateCredentials(
  credentials: CredentialInput,
  dependencies: CredentialDependencies,
) {
  const rawEmail = credentials?.email;
  const password = credentials?.password;
  const captchaToken = credentials?.captchaToken;

  if (typeof rawEmail !== "string" || typeof password !== "string") {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  const email = normalizeEmail(rawEmail);
  if (!email || !password) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }
  const normalizedCaptchaToken = typeof captchaToken === "string"
    ? captchaToken.trim()
    : "";
  if (normalizedCaptchaToken.length > 4_096) {
    throw new Error(CAPTCHA_REJECTED_MESSAGE);
  }

  let rateLimitResult;
  try {
    rateLimitResult = await dependencies.rateLimiter.consume(
      RATE_LIMIT_POLICIES.credentialsLogin,
      [
        clientIpRateLimitSubject(dependencies.clientIp),
        emailRateLimitSubject(email),
      ],
    );
  } catch {
    throw new Error(AUTH_PROTECTION_UNAVAILABLE_MESSAGE);
  }

  if (!rateLimitResult.allowed) {
    throw new Error(CREDENTIALS_RATE_LIMITED_MESSAGE);
  }

  let captchaResult;
  try {
    captchaResult = await dependencies.captchaVerifier.verify({
      token: normalizedCaptchaToken,
      ...(dependencies.clientIp ? { remoteIp: dependencies.clientIp } : {}),
    });
  } catch {
    throw new Error(AUTH_PROTECTION_UNAVAILABLE_MESSAGE);
  }

  if (!captchaResult.success) {
    if (captchaResult.reason === "MISSING") {
      throw new Error(CAPTCHA_REQUIRED_MESSAGE);
    }
    if (captchaResult.reason === "TIMEOUT" || captchaResult.reason === "UNAVAILABLE") {
      throw new Error(AUTH_PROTECTION_UNAVAILABLE_MESSAGE);
    }
    throw new Error(CAPTCHA_REJECTED_MESSAGE);
  }

  const user = await dependencies.findUserByEmail(email);
  const passwordIsValid = await dependencies.verifyPassword(
    password,
    user?.password || DUMMY_PASSWORD_HASH,
  );
  if (!user?.password || !passwordIsValid) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    canManageArticles: user.canManageArticles,
  };
}
