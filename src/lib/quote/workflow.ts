import type { QuoteStatus } from "@/config/quote";

export type QuoteActorRole = "ADMIN" | "STAFF" | "FINANCE";

export const QUOTE_ACTOR_ROLES: ReadonlySet<string> = new Set([
  "ADMIN",
  "STAFF",
  "FINANCE",
]);

const transitionRoles: Record<
  QuoteStatus,
  Partial<Record<QuoteStatus, readonly QuoteActorRole[]>>
> = {
  PENDING: {
    PROCESSING: ["ADMIN", "STAFF"],
    CLOSED: ["ADMIN"],
  },
  PROCESSING: {
    PENDING: ["ADMIN"],
    QUOTED: ["ADMIN", "STAFF", "FINANCE"],
    CLOSED: ["ADMIN"],
  },
  QUOTED: {
    PROCESSING: ["ADMIN"],
    ACCEPTED: ["ADMIN"],
    REJECTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  ACCEPTED: {
    QUOTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  REJECTED: {
    QUOTED: ["ADMIN"],
    CLOSED: ["ADMIN"],
  },
  CLOSED: {},
};

export function asQuoteActorRole(role: string | undefined): QuoteActorRole | null {
  return role && QUOTE_ACTOR_ROLES.has(role)
    ? role as QuoteActorRole
    : null;
}

export function canTransitionQuote(
  role: QuoteActorRole,
  from: QuoteStatus,
  to: QuoteStatus,
) {
  return transitionRoles[from][to]?.includes(role) ?? false;
}

export function quoteTransitionRequiresReason(
  from: QuoteStatus,
  to: QuoteStatus,
) {
  return (
    (to === "CLOSED" && ["PENDING", "PROCESSING", "QUOTED"].includes(from)) ||
    (from === "PROCESSING" && to === "PENDING") ||
    (from === "QUOTED" && to === "PROCESSING") ||
    (["ACCEPTED", "REJECTED"].includes(from) && to === "QUOTED")
  );
}

export function canEditQuotePricing(role: QuoteActorRole, status: QuoteStatus) {
  return status === "PROCESSING" && (role === "ADMIN" || role === "FINANCE");
}

export function canEditQuoteCustomerNote(
  role: QuoteActorRole,
  status: QuoteStatus,
) {
  return status === "PROCESSING" && QUOTE_ACTOR_ROLES.has(role);
}

export function canEditQuoteInternalNote(
  role: QuoteActorRole,
  status: QuoteStatus,
) {
  return status !== "CLOSED" && (role === "ADMIN" || role === "STAFF");
}
