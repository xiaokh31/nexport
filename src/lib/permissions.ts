export const USER_ROLES = [
  "ADMIN",
  "STAFF",
  "WAREHOUSE",
  "FINANCE",
  "CUSTOMER",
  "PARTNER",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const CAPABILITIES = [
  "admin.overview",
  "quotes.read",
  "quotes.update",
  "quotes.delete",
  "articles.manage",
  "pages.manage",
  "users.manage",
  "notifications.broadcast",
  "settings.manage",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export interface CapabilitySubject {
  role: UserRole;
  canManageArticles: boolean;
}

export interface CapabilityActor extends CapabilitySubject {
  id: string;
  name: string | null;
  email: string;
}

export type CurrentActorLoader = (
  userId: string,
) => Promise<CapabilityActor | null>;

export type AuthorizationDecision =
  | { authorized: true; actor: CapabilityActor }
  | { authorized: false; reason: "UNAUTHENTICATED" | "FORBIDDEN" };

export interface AdminAccessProfile {
  subject: CapabilitySubject;
  capabilities: Capability[];
  defaultPath: string | null;
}

interface CapabilityRule {
  roles: readonly UserRole[];
  staffArticleFlag?: true;
}

/** The only role-to-capability matrix used by API and UI authorization. */
export const capabilityMatrix: Record<Capability, CapabilityRule> = {
  "admin.overview": { roles: ["ADMIN"] },
  "quotes.read": { roles: ["ADMIN", "STAFF", "FINANCE"] },
  "quotes.update": { roles: ["ADMIN", "STAFF", "FINANCE"] },
  "quotes.delete": { roles: ["ADMIN"] },
  "articles.manage": { roles: ["ADMIN"], staffArticleFlag: true },
  "pages.manage": { roles: ["ADMIN"] },
  "users.manage": { roles: ["ADMIN"] },
  "notifications.broadcast": { roles: ["ADMIN"] },
  "settings.manage": { roles: ["ADMIN"] },
};

export type AdminModule =
  | "overview"
  | "articles"
  | "quotes"
  | "users"
  | "messages"
  | "pages"
  | "settings";

export const adminModuleCapabilities: Record<AdminModule, Capability> = {
  overview: "admin.overview",
  articles: "articles.manage",
  quotes: "quotes.read",
  users: "users.manage",
  messages: "notifications.broadcast",
  pages: "pages.manage",
  settings: "settings.manage",
};

export const modulePathMap: Record<AdminModule, string> = {
  overview: "/admin",
  articles: "/admin/articles",
  quotes: "/admin/quotes",
  users: "/admin/users",
  messages: "/admin/messages",
  pages: "/admin/pages",
  settings: "/admin/settings",
};

const moduleLandingOrder: readonly AdminModule[] = [
  "overview",
  "quotes",
  "articles",
  "users",
  "messages",
  "pages",
  "settings",
];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function hasCapability(
  subject: CapabilitySubject,
  capability: Capability,
): boolean {
  const rule = capabilityMatrix[capability];
  if (rule.roles.includes(subject.role)) return true;

  return Boolean(
    rule.staffArticleFlag &&
      subject.role === "STAFF" &&
      subject.canManageArticles,
  );
}

export function getCapabilities(subject: CapabilitySubject): Capability[] {
  return CAPABILITIES.filter((capability) => hasCapability(subject, capability));
}

export async function authorizeCapability(
  sessionUserId: string | null | undefined,
  capability: Capability,
  loadActor: CurrentActorLoader,
): Promise<AuthorizationDecision> {
  if (!sessionUserId) {
    return { authorized: false, reason: "UNAUTHENTICATED" };
  }

  const actor = await loadActor(sessionUserId);
  if (!actor) {
    return { authorized: false, reason: "UNAUTHENTICATED" };
  }
  if (!hasCapability(actor, capability)) {
    return { authorized: false, reason: "FORBIDDEN" };
  }

  return { authorized: true, actor };
}

export function canAccessModule(
  subject: CapabilitySubject,
  module: AdminModule,
): boolean {
  return hasCapability(subject, adminModuleCapabilities[module]);
}

export function canAccessAdmin(subject: CapabilitySubject): boolean {
  return getDefaultAdminPath(subject) !== null;
}

export function getAccessibleModules(subject: CapabilitySubject): AdminModule[] {
  return moduleLandingOrder.filter((module) => canAccessModule(subject, module));
}

export function getDefaultAdminPath(subject: CapabilitySubject): string | null {
  const firstModule = moduleLandingOrder.find((module) =>
    canAccessModule(subject, module),
  );
  return firstModule ? modulePathMap[firstModule] : null;
}

export function getModuleFromPath(path: string): AdminModule | null {
  if (path === "/admin") return "overview";

  const matchingModule = Object.entries(modulePathMap).find(
    ([, modulePath]) =>
      modulePath !== "/admin" &&
      (path === modulePath || path.startsWith(`${modulePath}/`)),
  );
  return matchingModule ? (matchingModule[0] as AdminModule) : null;
}

export function canAccessPath(
  subject: CapabilitySubject,
  path: string,
): boolean {
  const module = getModuleFromPath(path);
  return module ? canAccessModule(subject, module) : false;
}
