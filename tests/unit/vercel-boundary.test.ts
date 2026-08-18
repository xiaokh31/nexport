import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getDeploymentPolicy } from "../../src/config/deployment";
import { emailOutboxSchedulerContract } from "../../src/config/email-outbox-scheduler";
import { EnvironmentConfigurationError } from "../../src/config/env/shared";
import {
  handleEmailOutboxHttpRequest,
  parseEmailOutboxBatchSize,
} from "../../src/lib/notifications/outbox-http";
import {
  formatDatabaseTargetSummary,
  validateDatabaseTarget,
} from "../../scripts/admin/database-target.mjs";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

const workerSummary = {
  claimed: 1,
  sent: 1,
  retried: 0,
  failed: 0,
  manualReview: 0,
  staleCompletions: 0,
};

function schedulerRequest(options: { secret?: string; limit?: string } = {}) {
  const url = new URL("https://znb.example/api/cron/email-outbox");
  if (options.limit !== undefined) url.searchParams.set("limit", options.limit);
  return new Request(url, {
    method: "GET",
    headers: options.secret
      ? { Authorization: `Bearer ${options.secret}` }
      : undefined,
  });
}

function databaseEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    DATABASE_URL: "postgresql://app:pooled-secret@pool.db.example:6543/znb?sslmode=require",
    DIRECT_URL: "postgresql://direct_app:direct-secret@direct.db.example:5432/znb?sslmode=require",
    DATABASE_TARGET_ENVIRONMENT: "staging",
    DATABASE_TARGET_ID: "znb-staging",
    DATABASE_PROVIDER: "provider-to-confirm",
    DATABASE_REGION: "region-to-confirm",
    DATABASE_ALLOWED_HOSTS: "pool.db.example,direct.db.example",
    DATABASE_BACKUP_ID: "backup-evidence-001",
    DATABASE_TARGET_CONFIRMATION: "staging:znb-staging",
    PRODUCTION_CHANGE_CONFIRMATION: "",
    ...overrides,
  };
}

describe("VERCEL-001 deployment boundaries", () => {
  it("enables indexing only for an explicitly enabled Vercel Production build", () => {
    expect(getDeploymentPolicy({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      SITE_INDEXING_ENABLED: "true",
    }).indexingEnabled).toBe(true);

    for (const environment of [
      { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" },
      { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "preview", SITE_INDEXING_ENABLED: "true" },
      { NODE_ENV: "production", VERCEL_ENV: "production", SITE_INDEXING_ENABLED: "true" },
      { NODE_ENV: "development", VERCEL: "1", VERCEL_ENV: "production", SITE_INDEXING_ENABLED: "true" },
    ]) {
      expect(getDeploymentPolicy(environment).indexingEnabled).toBe(false);
    }
  });

  it("keeps every non-public surface fail-safe at metadata, header, robots, and sitemap layers", () => {
    expect(source("src/app/layout.tsx")).toContain("index: indexingEnabled");
    expect(source("next.config.ts")).toContain("X-Robots-Tag");
    expect(source("src/app/robots.ts")).toContain('disallow: "/"');
    expect(source("src/app/sitemap.ts")).toContain(
      "if (!getDeploymentPolicy().indexingEnabled) return []",
    );
    expect(source("next.config.ts")).toContain("VERCEL_PROJECT_PRODUCTION_URL");
  });

  it("shares the GET/POST worker handler and has no unsupported Vercel Cron", () => {
    const route = source("src/app/api/cron/email-outbox/route.ts");
    const vercel = JSON.parse(source("vercel.json"));
    const deploymentGuide = source("docs/08-vercel-production-deployment.md");
    expect(route).toContain("export const GET = handleRequest");
    expect(route).toContain("export const POST = handleRequest");
    expect(vercel.crons).toBeUndefined();
    expect(emailOutboxSchedulerContract).toMatchObject({
      path: "/api/cron/email-outbox",
      method: "GET",
      frequencyMinutes: 5,
      requestTimeoutSeconds: 50,
      retryableStatuses: [429, 500, 503],
    });
    expect(deploymentGuide).toContain("x-vercel-protection-bypass");
    expect(deploymentGuide).toContain("Authorization: Bearer <CRON_SECRET>");
    expect(deploymentGuide).toContain("不撤销 PostgreSQL migration");
  });

  it("authenticates scheduler requests, validates limits, and reports config failures", async () => {
    const process = vi.fn().mockResolvedValue(workerSummary);
    const dependencies = {
      loadCronSecret: () => "a".repeat(32),
      process,
      logger: { error: vi.fn() },
    };

    expect((await handleEmailOutboxHttpRequest(
      schedulerRequest(),
      dependencies,
    )).status).toBe(401);
    expect((await handleEmailOutboxHttpRequest(
      schedulerRequest({ secret: "wrong" }),
      dependencies,
    )).status).toBe(401);

    const response = await handleEmailOutboxHttpRequest(
      schedulerRequest({ secret: "a".repeat(32), limit: "100" }),
      dependencies,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      batchSize: 100,
      summary: workerSummary,
    });
    expect(process).toHaveBeenCalledWith(100);

    for (const limit of ["0", "101", "1.5", "25items", "-1"]) {
      expect(parseEmailOutboxBatchSize(
        `https://znb.example/api/cron/email-outbox?limit=${limit}`,
      )).toBeNull();
    }

    const unavailable = await handleEmailOutboxHttpRequest(
      schedulerRequest({ secret: "a".repeat(32) }),
      {
        loadCronSecret: () => {
          throw new EnvironmentConfigurationError("missing CRON_SECRET");
        },
        process,
        logger: { error: vi.fn() },
      },
    );
    expect(unavailable.status).toBe(503);
  });

  it("locks install/build versions and never runs migration in ordinary lifecycle scripts", () => {
    const packageJson = JSON.parse(source("package.json"));
    const vercel = JSON.parse(source("vercel.json"));
    expect(packageJson.engines.node).toBe("24.x");
    expect(packageJson.packageManager).toBe("pnpm@10.27.0");
    expect(vercel.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(vercel.buildCommand).toBe("pnpm build");
    expect(packageJson.scripts.build).not.toMatch(/migrate|db push/);
    expect(packageJson.scripts.postinstall).not.toMatch(/migrate|db push/);
    expect(source("prisma/schema.prisma")).toContain('directUrl = env("DIRECT_URL")');
    expect(source("src/config/env/server.ts")).not.toContain("DIRECT_URL");
  });

  it("uses one explicit canonical origin for site metadata and NextAuth", () => {
    const serverEnvironment = source("src/config/env/server.ts");
    expect(serverEnvironment).toContain('"NEXTAUTH_URL"');
    expect(serverEnvironment).toContain(
      "NEXTAUTH_URL must match NEXT_PUBLIC_SITE_URL for this deployment.",
    );
  });

  it("accepts a fully confirmed target and never prints URL credentials", () => {
    const target = validateDatabaseTarget(databaseEnvironment());
    const summary = formatDatabaseTargetSummary(target);
    expect(target).toMatchObject({
      environment: "staging",
      targetId: "znb-staging",
      backupConfirmed: true,
    });
    expect(summary).toContain("pool.db.example");
    expect(summary).toContain("direct.db.example");
    expect(summary).not.toContain("pooled-secret");
    expect(summary).not.toContain("direct-secret");
    expect(summary).not.toContain("sslmode");
  });

  it("rejects mismatched targets, hosts outside the allowlist, missing backup, and unconfirmed production", () => {
    expect(() => validateDatabaseTarget(databaseEnvironment({
      DIRECT_URL: "postgresql://app:secret@direct.db.example:5432/znb_production",
    }))).toThrow(/same database/);
    expect(() => validateDatabaseTarget(databaseEnvironment({
      DATABASE_ALLOWED_HOSTS: "pool.db.example",
    }))).toThrow(/not in DATABASE_ALLOWED_HOSTS/);
    expect(() => validateDatabaseTarget(databaseEnvironment({
      DATABASE_BACKUP_ID: "",
    }))).toThrow(/DATABASE_BACKUP_ID is required/);
    expect(() => validateDatabaseTarget(databaseEnvironment({
      DATABASE_TARGET_CONFIRMATION: "staging:another-target",
    }))).toThrow(/DATABASE_TARGET_CONFIRMATION/);
    expect(() => validateDatabaseTarget(databaseEnvironment({
      DATABASE_TARGET_ENVIRONMENT: "production",
      DATABASE_TARGET_ID: "znb-production",
      DATABASE_TARGET_CONFIRMATION: "production:znb-production",
    }), {
      requireProductionConfirmation: true,
    })).toThrow(/PRODUCTION_CHANGE_CONFIRMATION/);
  });

  it("requires the deployment target summary and direct URL before administrator promotion", () => {
    const promotion = source("scripts/admin/promote.mjs");
    expect(promotion).toContain("validateDatabaseTarget(process.env");
    expect(promotion).toContain("formatDatabaseTargetSummary(target)");
    expect(promotion).toContain("datasourceUrl: process.env.DIRECT_URL");
  });
});
