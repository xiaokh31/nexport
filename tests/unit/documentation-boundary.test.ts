import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

function environmentKeys() {
  return [...source(".env.example").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)]
    .map((match) => match[1]);
}

describe("DOC-001 operator documentation boundaries", () => {
  it("keeps the environment example aligned with supported configuration", () => {
    const documented = environmentKeys();
    const expected = [
      "DATABASE_URL",
      "NEXT_PUBLIC_SITE_URL",
      "DATABASE_URL_TEST",
      "TEST_DATABASE_MARKER",
      "TEST_POSTGRES_PORT",
      "PLAYWRIGHT_BASE_URL",
      "NEXTAUTH_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
      "RECAPTCHA_SECRET_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "CRON_SECRET",
      "RATE_LIMIT_SECRET",
      "TRUSTED_PROXY_HOPS",
      "GOOGLE_SITE_VERIFICATION",
      "BING_SITE_VERIFICATION",
      "BAIDU_SITE_VERIFICATION",
      "YANDEX_SITE_VERIFICATION",
    ];

    expect(documented).toEqual(expected);
    expect(new Set(documented).size).toBe(documented.length);

    const runtimeConfig = [
      source("src/config/env/public.ts"),
      source("src/config/env/server.ts"),
      source("prisma/schema.prisma"),
    ].join("\n");
    for (const key of expected.filter((key) => !key.includes("TEST") && key !== "PLAYWRIGHT_BASE_URL")) {
      expect(runtimeConfig, key).toContain(key);
    }
    expect(runtimeConfig).not.toContain("EMAIL_TO");
  });

  it("documents a complete empty-database onboarding and deployment path", () => {
    const readme = source("README.md");
    for (const instruction of [
      "pnpm install",
      "cp .env.example .env",
      "docker run --name nexport-postgres",
      "pnpm prisma:generate",
      "pnpm exec prisma migrate deploy",
      "pnpm dev",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test:all",
      "pnpm build",
      "pnpm start",
      "pnpm admin:promote --email",
      "POST /api/cron/email-outbox",
    ]) {
      expect(readme, instruction).toContain(instruction);
    }
    expect(readme).toContain("没有默认密码、管理员 seed 或隐藏的演示登录");
    expect(readme).toContain("pnpm install --frozen-lockfile");
  });

  it("records every service type and capability from the canonical source", () => {
    const readme = source("README.md");
    const quoteConfig = source("src/config/quote.ts");
    const permissions = source("src/lib/permissions.ts");
    const serviceTypes = [...quoteConfig.matchAll(/^  "([A-Z_]+)",$/gm)]
      .map((match) => match[1])
      .slice(0, 9);
    const capabilities = [...permissions.matchAll(/^  "([a-z]+\.[a-z]+)",$/gm)]
      .map((match) => match[1]);

    expect(serviceTypes).toHaveLength(9);
    expect(capabilities).toHaveLength(9);
    for (const contract of [...serviceTypes, ...capabilities]) {
      expect(readme, contract).toContain(`\`${contract}\``);
    }
    expect(readme).toContain("STAFF.canManageArticles=true");
  });

  it("explains article publication and the unresolved company launch blockers", () => {
    const readme = source("README.md");
    for (const contract of [
      "DRAFT",
      "PUBLISHED",
      "ARCHIVED",
      "publishedAt",
      "首次发布后 slug 永久锁定",
      "ZNB Logistics Inc.",
      "src/app/manifest.ts",
      "privacy",
      "terms",
      "公开 shell 的构建时静态配置",
      "QA-001～003",
    ]) {
      expect(readme, contract).toContain(contract);
    }
  });

  it("keeps onboarding links resolvable and states the AGPL review boundary", () => {
    for (const file of ["README.md", "docs/README.md"]) {
      for (const match of source(file).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^[a-z]+:/i.test(target)) continue;
        expect(
          existsSync(path.resolve(path.dirname(file), target)),
          `${file} -> ${target}`,
        ).toBe(true);
      }
    }

    const readme = source("README.md");
    expect(readme).toContain("GNU Affero General Public License v3.0");
    expect(readme).toContain("网络向用户提供修改后的程序");
    expect(readme).toContain("项目使用方自行进行法律与合规审核");
    expect(readme).toContain("没有修改 `LICENSE` 正文");
  });
});
