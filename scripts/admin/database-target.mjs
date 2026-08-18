const SUPPORTED_ENVIRONMENTS = new Set([
  "development",
  "staging",
  "production",
]);

function requiredValue(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parsePostgresUrl(environment, name) {
  const rawValue = requiredValue(environment, name);
  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL.`);
  }

  if (!new Set(["postgres:", "postgresql:"]).has(url.protocol)) {
    throw new Error(`${name} must use the postgres or postgresql protocol.`);
  }

  let database;
  let user;
  try {
    database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    user = decodeURIComponent(url.username);
  } catch {
    throw new Error(`${name} contains invalid URL encoding.`);
  }
  if (!url.hostname || !database || !user) {
    throw new Error(`${name} must include a host, database, and user.`);
  }

  return Object.freeze({
    host: url.hostname.toLowerCase(),
    port: url.port || "5432",
    database,
    user,
  });
}

function parseAllowedHosts(environment) {
  const hosts = requiredValue(environment, "DATABASE_ALLOWED_HOSTS")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (hosts.length === 0 || hosts.some((host) => host.includes("*"))) {
    throw new Error(
      "DATABASE_ALLOWED_HOSTS must contain exact hostnames without wildcards.",
    );
  }
  return new Set(hosts);
}

export function validateDatabaseTarget(
  environment,
  {
    requireBackup = true,
    requireProductionConfirmation = false,
  } = {},
) {
  const targetEnvironment = requiredValue(
    environment,
    "DATABASE_TARGET_ENVIRONMENT",
  ).toLowerCase();
  if (!SUPPORTED_ENVIRONMENTS.has(targetEnvironment)) {
    throw new Error(
      "DATABASE_TARGET_ENVIRONMENT must be development, staging, or production.",
    );
  }

  const targetId = requiredValue(environment, "DATABASE_TARGET_ID");
  const provider = requiredValue(environment, "DATABASE_PROVIDER");
  const region = requiredValue(environment, "DATABASE_REGION");
  const pooled = parsePostgresUrl(environment, "DATABASE_URL");
  const direct = parsePostgresUrl(environment, "DIRECT_URL");
  const allowedHosts = parseAllowedHosts(environment);

  for (const connection of [pooled, direct]) {
    if (!allowedHosts.has(connection.host)) {
      throw new Error(
        `Database host ${connection.host} is not in DATABASE_ALLOWED_HOSTS.`,
      );
    }
  }
  if (pooled.database !== direct.database) {
    throw new Error(
      "DATABASE_URL and DIRECT_URL must identify the same database.",
    );
  }

  const expectedTargetConfirmation = `${targetEnvironment}:${targetId}`;
  if (environment.DATABASE_TARGET_CONFIRMATION?.trim() !== expectedTargetConfirmation) {
    throw new Error(
      `DATABASE_TARGET_CONFIRMATION must equal ${expectedTargetConfirmation}.`,
    );
  }

  if (requireBackup) {
    requiredValue(environment, "DATABASE_BACKUP_ID");
  }

  if (requireProductionConfirmation && targetEnvironment === "production") {
    const expectedProductionConfirmation = `DEPLOY ${targetId} TO PRODUCTION`;
    if (
      environment.PRODUCTION_CHANGE_CONFIRMATION?.trim() !==
      expectedProductionConfirmation
    ) {
      throw new Error(
        `PRODUCTION_CHANGE_CONFIRMATION must equal ${expectedProductionConfirmation}.`,
      );
    }
  }

  return Object.freeze({
    environment: targetEnvironment,
    targetId,
    provider,
    region,
    pooled,
    direct,
    backupConfirmed: requireBackup,
  });
}

export function formatDatabaseTargetSummary(target) {
  const connection = (name, value) =>
    `${name}=host:${value.host} port:${value.port} database:${value.database} user:${value.user}`;
  return [
    `database-target environment=${target.environment} target=${target.targetId} provider=${target.provider} region=${target.region}`,
    connection("pooled", target.pooled),
    connection("direct", target.direct),
    `backup-confirmed=${target.backupConfirmed ? "yes" : "not-required"}`,
  ].join("\n");
}
