const REQUIRED_MARKER = "nexport-test-only";
const DEFAULT_DATABASE_URL_TEST =
  "postgresql://nexport_test:nexport_test_password@127.0.0.1:55432/nexport_test?schema=public&application_name=nexport-test-only";
const DEFAULT_PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3100";
const LOCAL_TEST_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

/** @typedef {Record<string, string | undefined>} TestEnvironment */

export class UnsafeTestDatabaseError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeTestDatabaseError";
  }
}

/**
 * Resolve and validate the only database URL destructive test helpers may use.
 * Custom URLs require an explicit marker; the built-in default is local-only.
 * @param {TestEnvironment} [environment]
 */
export function resolveTestDatabaseSettings(environment = process.env) {
  const configuredUrl = environment.DATABASE_URL_TEST?.trim();
  const databaseUrl = configuredUrl || DEFAULT_DATABASE_URL_TEST;
  const marker = environment.TEST_DATABASE_MARKER?.trim() ||
    (configuredUrl ? undefined : REQUIRED_MARKER);

  if (marker !== REQUIRED_MARKER) {
    throw new UnsafeTestDatabaseError(
      `TEST_DATABASE_MARKER must equal ${REQUIRED_MARKER}.`,
    );
  }

  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new UnsafeTestDatabaseError("DATABASE_URL_TEST must be a valid URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new UnsafeTestDatabaseError("DATABASE_URL_TEST must use PostgreSQL.");
  }
  if (!LOCAL_TEST_HOSTS.has(url.hostname)) {
    throw new UnsafeTestDatabaseError(
      "Destructive test commands only accept a local PostgreSQL host.",
    );
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!databaseName.endsWith("_test")) {
    throw new UnsafeTestDatabaseError(
      "The test database name must end with _test.",
    );
  }
  if (!url.username.toLowerCase().includes("test")) {
    throw new UnsafeTestDatabaseError(
      "The test database user must contain the word test.",
    );
  }
  if (!url.password) {
    throw new UnsafeTestDatabaseError(
      "The isolated test database requires an explicit ephemeral password.",
    );
  }

  const port = Number(url.port);
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535 || port === 5432) {
    throw new UnsafeTestDatabaseError(
      "The test database must use an explicit non-default PostgreSQL port.",
    );
  }
  if (url.searchParams.get("application_name") !== REQUIRED_MARKER) {
    throw new UnsafeTestDatabaseError(
      `DATABASE_URL_TEST application_name must equal ${REQUIRED_MARKER}.`,
    );
  }

  return Object.freeze({
    databaseUrl: url.toString(),
    databaseName,
    hostname: url.hostname,
    marker,
    password: decodeURIComponent(url.password),
    port,
    username: decodeURIComponent(url.username),
  });
}

/** @param {TestEnvironment} [environment] */
export function createTestProcessEnvironment(environment = process.env) {
  const settings = resolveTestDatabaseSettings(environment);
  const playwrightBaseUrl = resolvePlaywrightBaseUrl(environment);

  return {
    ...environment,
    NODE_ENV: "test",
    DATABASE_URL_TEST: settings.databaseUrl,
    DATABASE_URL: settings.databaseUrl,
    DIRECT_URL: settings.databaseUrl,
    TEST_DATABASE_MARKER: settings.marker,
    TEST_POSTGRES_DB: settings.databaseName,
    TEST_POSTGRES_PASSWORD: settings.password,
    TEST_POSTGRES_PORT: String(settings.port),
    TEST_POSTGRES_USER: settings.username,
    NEXT_PUBLIC_SITE_URL: playwrightBaseUrl,
    NEXTAUTH_URL: playwrightBaseUrl,
    SITE_INDEXING_ENABLED: "false",
    PLAYWRIGHT_BASE_URL: playwrightBaseUrl,
    NEXTAUTH_SECRET:
      environment.NEXTAUTH_SECRET || "nexport-test-only-nextauth-secret",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "",
    RECAPTCHA_SECRET_KEY: "",
    RATE_LIMIT_SECRET: "nexport-test-only-rate-limit-secret-2026",
    TRUSTED_PROXY_HOPS: "0",
  };
}

/** @param {TestEnvironment} [environment] */
export function resolvePlaywrightBaseUrl(environment = process.env) {
  const configured = environment.PLAYWRIGHT_BASE_URL?.trim() ||
    DEFAULT_PLAYWRIGHT_BASE_URL;
  let url;

  try {
    url = new URL(configured);
  } catch {
    throw new UnsafeTestDatabaseError("PLAYWRIGHT_BASE_URL must be a valid URL.");
  }

  if (
    url.protocol !== "http:" ||
    !LOCAL_TEST_HOSTS.has(url.hostname) ||
    url.port !== "3100" ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new UnsafeTestDatabaseError(
      "PLAYWRIGHT_BASE_URL must be the local HTTP origin on port 3100.",
    );
  }

  return url.origin;
}

/** @param {TestEnvironment} [environment] */
export function assertTestRuntime(environment = process.env) {
  if (environment.NODE_ENV !== "test") {
    throw new UnsafeTestDatabaseError(
      "Test fixtures and doubles require NODE_ENV=test.",
    );
  }
  return resolveTestDatabaseSettings(environment);
}

export const testDatabaseSafetyConstants = Object.freeze({
  defaultDatabaseUrl: DEFAULT_DATABASE_URL_TEST,
  defaultPlaywrightBaseUrl: DEFAULT_PLAYWRIGHT_BASE_URL,
  requiredMarker: REQUIRED_MARKER,
});
