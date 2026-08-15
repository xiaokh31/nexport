const INTERNAL_ORIGIN = "https://notification-link.invalid";

/** Return a normalized same-origin path, or null when the link is unsafe. */
export function normalizeNotificationLink(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (
    normalized.length > 2_048 ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    return null;
  }

  try {
    const parsed = new URL(normalized, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN || parsed.username || parsed.password) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
