import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("RBAC source boundaries", () => {
  it("routes every sensitive API through the shared capability guard", () => {
    const expectedCapabilities = new Map([
      ["src/app/api/admin/stats/route.ts", ["admin.overview"]],
      ["src/app/api/admin/quotes/route.ts", ["quotes.read", "quotes.update", "quotes.delete"]],
      ["src/app/api/admin/articles/route.ts", ["articles.manage"]],
      ["src/app/api/admin/articles/[id]/route.ts", ["articles.manage"]],
      ["src/app/api/admin/pages/route.ts", ["pages.manage"]],
      ["src/app/api/admin/pages/[id]/route.ts", ["pages.manage"]],
      ["src/app/api/admin/users/route.ts", ["users.manage"]],
      ["src/app/api/admin/settings/route.ts", ["settings.manage"]],
      ["src/app/api/admin/email-outbox/route.ts", ["notifications.broadcast"]],
      ["src/app/api/notifications/route.ts", ["notifications.broadcast"]],
    ]);

    for (const [file, capabilities] of expectedCapabilities) {
      const routeSource = source(file);
      expect(routeSource, file).toContain("requireCapability");
      for (const capability of capabilities) {
        expect(routeSource, `${file}: ${capability}`).toMatch(
          new RegExp(`requireCapability\\(["']${capability.replace(".", "\\.")}["']\\)`),
        );
      }
    }
  });

  it("reloads the current actor from the database for each capability check", () => {
    const authorizationSource = source("src/lib/authorization.ts");

    expect(authorizationSource).toContain("prisma.user.findUnique");
    expect(authorizationSource).toContain("authorizeCapability(");
    expect(authorizationSource).toContain("loadCurrentActor");
  });

  it("derives the guard, sidebar, and header entry from authoritative access", () => {
    expect(source("src/components/admin/admin-guard.tsx")).toContain(
      "useAdminAccess(session?.user?.id)",
    );
    expect(source("src/components/admin/admin-sidebar.tsx")).toContain(
      "canAccessModule(subject, item.module)",
    );
    expect(source("src/components/layout/header.tsx")).toContain(
      "adminAccess?.defaultPath",
    );
  });

  it("keeps administrator bootstrap explicit, verified, and password-free", () => {
    const promotionSource = source("scripts/admin/promote.mjs");

    expect(promotionSource).toContain("--email");
    expect(promotionSource).toContain("user.emailVerified");
    expect(promotionSource).not.toMatch(/password\s*:/);
    expect(promotionSource).not.toMatch(/(?:admin|demo)@/i);
  });
});
