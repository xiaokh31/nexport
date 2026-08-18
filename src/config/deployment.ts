const VERCEL_ENVIRONMENTS = new Set(["production", "preview", "development"]);

export type DeploymentPolicy = {
  vercelEnvironment: "production" | "preview" | "development" | "local";
  isVercelRuntime: boolean;
  indexingEnabled: boolean;
};

export function getDeploymentPolicy(
  environment: Record<string, string | undefined> = process.env,
): DeploymentPolicy {
  const rawVercelEnvironment = environment.VERCEL_ENV?.trim().toLowerCase();
  const vercelEnvironment = rawVercelEnvironment &&
    VERCEL_ENVIRONMENTS.has(rawVercelEnvironment)
    ? rawVercelEnvironment as DeploymentPolicy["vercelEnvironment"]
    : "local";
  const isVercelRuntime = environment.VERCEL === "1" &&
    vercelEnvironment !== "local";
  const indexingEnabled = environment.NODE_ENV === "production" &&
    isVercelRuntime &&
    vercelEnvironment === "production" &&
    environment.SITE_INDEXING_ENABLED?.trim().toLowerCase() === "true";

  return { vercelEnvironment, isVercelRuntime, indexingEnabled };
}
