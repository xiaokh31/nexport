import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

describe("UI-004 auth, user workspace, and admin boundaries", () => {
  it("renders the dashboard from real quote and notification APIs only", () => {
    const page = source("src/app/dashboard/page.tsx");
    const dashboard = source("src/app/dashboard/dashboard-client.tsx");

    expect(page).toContain("getServerSession(authOptions)");
    expect(page).toContain('redirect("/login")');
    expect(dashboard).toContain('fetch("/api/user/quotes?page=1&limit=5"');
    expect(dashboard).toContain('fetch("/api/notifications?page=1&limit=5"');
    expect(dashboard).toContain("Promise.all");
    expect(dashboard).not.toMatch(/pendingOrders|inTransit|pendingReturns|monthlyOrders/);
    expect(dashboard).not.toMatch(/recentOrders|inventoryOverview|connectDbHint/);
  });

  it("removes controls whose behavior is not connected to a backend workflow", () => {
    const profile = source("src/app/user/profile/page.tsx");
    const userSettings = source("src/app/user/settings/page.tsx");
    const adminSettings = source("src/app/admin/settings/page.tsx");
    const adminSettingsApi = source("src/app/api/admin/settings/route.ts");

    expect(profile).not.toMatch(/uploadAvatar|AvatarImage|AvatarFallback|Upload/);
    expect(userSettings).not.toMatch(/deleteAccount|confirmDelete|dangerZone/);
    expect(adminSettings).not.toMatch(/sessionTimeout|maxLoginAttempts|安全参数.*Input/);
    expect(adminSettingsApi).not.toMatch(/Company Name|example\.com|sessionTimeout|maxLoginAttempts/);
    expect(adminSettingsApi).toContain("settingKeys");
    expect(userSettings).toContain("/api/user/login-history?limit=20");
    expect(userSettings).toContain("/api/user/settings");
  });

  it("gives authentication, loading, error, and permission outcomes explicit semantics", () => {
    const login = source("src/app/login/login-form.tsx");
    const register = source("src/app/register/register-form.tsx");
    const verifyPage = source("src/app/verify-email/page.tsx");
    const guard = source("src/components/admin/admin-guard.tsx");
    const access = source("src/hooks/use-admin-access.ts");

    expect(login).toContain('role="alert" aria-live="assertive"');
    expect(register).toContain('role="alert" aria-live="assertive"');
    expect(login).not.toContain("setError(result.error)");
    expect(verifyPage).not.toContain("fallback={null}");
    expect(verifyPage).toContain('aria-busy="true"');
    expect(guard).toContain("无法进入此工作区");
    expect(guard).toContain("当前账户没有后台访问能力");
    expect(access).toContain("10_000");
    expect(access).toContain("权限检查超时");
  });

  it("keeps data tables inside named, keyboard-scrollable mobile regions", () => {
    const table = source("src/components/ui/table.tsx");
    const userQuotes = source("src/app/user/quotes/page.tsx");
    const adminTables = [
      "src/app/admin/articles/page.tsx",
      "src/app/admin/quotes/page.tsx",
      "src/app/admin/users/page.tsx",
      "src/app/admin/pages/page.tsx",
    ].map(source);

    expect(table).toContain("data-responsive-table");
    expect(table).toContain('role="region"');
    expect(table).toContain("tabIndex={0}");
    expect(table).toContain("overflow-x-auto");
    expect(table).toContain("min-w-max");
    expect(userQuotes).toContain("containerLabel={t.admin.quoteList}");
    for (const adminTable of adminTables) {
      expect(adminTable).toContain("containerLabel=");
      expect(adminTable).toMatch(/当前筛选|暂无页面/);
    }
  });

  it("requires confirmation for deletes, publication, privilege changes, and broadcasts", () => {
    const notifications = source("src/app/user/notifications/page.tsx");
    const articles = source("src/components/admin/article-editor-form.tsx");
    const pages = source("src/app/admin/pages/page.tsx");
    const quotes = source("src/app/admin/quotes/page.tsx");
    const users = source("src/app/admin/users/page.tsx");
    const messages = source("src/app/admin/messages/page.tsx");

    expect(notifications).toContain("pendingDelete");
    expect(notifications).toContain("confirmDescription");
    expect(articles).toContain("确认发布这篇文章");
    expect(pages).toContain("确认发布此页面");
    expect(pages).toContain("确定要删除此页面");
    expect(quotes).toContain("确认删除询价");
    expect(users).toContain("确认修改");
    expect(users).toContain("确定要删除此用户");
    expect(messages).toContain("broadcastArmed");
    expect(messages).toContain("确认广播给全部用户");
  });

  it("marks the current user and admin navigation destinations", () => {
    expect(source("src/components/user/user-sidebar.tsx"))
      .toContain('aria-current={isActive ? "page" : undefined}');
    expect(source("src/components/admin/admin-sidebar.tsx"))
      .toContain('aria-current={isActive ? "page" : undefined}');
  });
});
