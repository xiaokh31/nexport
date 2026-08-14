export const INVALID_CREDENTIALS_MESSAGE = "邮箱或密码错误";

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

  if (typeof rawEmail !== "string" || typeof password !== "string") {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
  }

  const email = normalizeEmail(rawEmail);
  if (!email || !password) {
    throw new Error(INVALID_CREDENTIALS_MESSAGE);
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
