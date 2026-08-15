export interface QuoteOwnership {
  userId: string | null;
  fingerprintSubject: string;
}

export interface OwnedQuoteWhere {
  userId: string;
  deletedAt: null;
}

function normalizeEmail(email: string) {
  return email.normalize("NFC").trim().toLowerCase();
}

/**
 * Quote ownership comes exclusively from the authenticated session. The
 * submitted email identifies an anonymous idempotency subject, never an owner.
 */
export function resolveQuoteOwnership(
  sessionUserId: string | null | undefined,
  submittedEmail: string,
): QuoteOwnership {
  if (sessionUserId) {
    return {
      userId: sessionUserId,
      fingerprintSubject: `user:${sessionUserId}`,
    };
  }

  return {
    userId: null,
    fingerprintSubject: `anonymous:${normalizeEmail(submittedEmail)}`,
  };
}

/**
 * User-facing quote reads are always scoped to the current session user and
 * exclude soft-deleted records. Request parameters cannot widen this filter.
 */
export function ownedQuoteWhere(sessionUserId: string): OwnedQuoteWhere {
  if (!sessionUserId) {
    throw new TypeError("An authenticated user id is required to list quotes");
  }

  return { userId: sessionUserId, deletedAt: null };
}
