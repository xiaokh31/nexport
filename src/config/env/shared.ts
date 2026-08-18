export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentConfigurationError";
  }
}

export function optionalEnvironmentValue(
  value: string | undefined
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function requireEnvironmentValue(
  name: string,
  value: string | undefined,
  service: string
): string {
  const normalized = optionalEnvironmentValue(value);

  if (!normalized) {
    throw new EnvironmentConfigurationError(
      `${service} is unavailable because ${name} is not configured.`
    );
  }

  return normalized;
}

export function validateSiteUrl(
  value: string | undefined,
  environment: string | undefined
): string {
  return validateOrigin(
    "NEXT_PUBLIC_SITE_URL",
    value,
    "Site metadata",
    environment,
  );
}

export function validateOrigin(
  name: string,
  value: string | undefined,
  service: string,
  environment: string | undefined,
): string {
  const normalized = requireEnvironmentValue(
    name,
    value,
    service,
  );

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    throw new EnvironmentConfigurationError(
      `${name} must be an absolute URL.`
    );
  }

  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new EnvironmentConfigurationError(
      `${name} must be an origin without credentials, a path, a query, or a fragment.`
    );
  }

  if (environment === "production" && url.protocol !== "https:") {
    throw new EnvironmentConfigurationError(
      `${name} must use HTTPS in production.`
    );
  }

  if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
    throw new EnvironmentConfigurationError(
      `${name} may use HTTP only for localhost development.`
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new EnvironmentConfigurationError(
      `${name} must use HTTP or HTTPS.`
    );
  }

  return url.origin;
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}
