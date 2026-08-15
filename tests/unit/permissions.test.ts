import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  authorizeCapability,
  canAccessAdmin,
  canAccessModule,
  canAccessPath,
  capabilityMatrix,
  getCapabilities,
  getDefaultAdminPath,
  hasCapability,
  type Capability,
  type CapabilitySubject,
} from "../../src/lib/permissions";

const admin: CapabilitySubject = {
  role: "ADMIN",
  canManageArticles: false,
};
const staffEditor: CapabilitySubject = {
  role: "STAFF",
  canManageArticles: true,
};
const staff: CapabilitySubject = {
  role: "STAFF",
  canManageArticles: false,
};
const finance: CapabilitySubject = {
  role: "FINANCE",
  canManageArticles: false,
};
const warehouse: CapabilitySubject = {
  role: "WAREHOUSE",
  canManageArticles: false,
};

const capabilityCases: Array<{
  capability: Capability;
  allowed: CapabilitySubject;
  denied: CapabilitySubject;
}> = [
  { capability: "admin.overview", allowed: admin, denied: staff },
  { capability: "quotes.read", allowed: staff, denied: warehouse },
  { capability: "quotes.update", allowed: finance, denied: warehouse },
  { capability: "quotes.delete", allowed: admin, denied: staff },
  { capability: "articles.manage", allowed: staffEditor, denied: staff },
  { capability: "pages.manage", allowed: admin, denied: staffEditor },
  { capability: "users.manage", allowed: admin, denied: finance },
  { capability: "notifications.broadcast", allowed: admin, denied: staff },
  { capability: "settings.manage", allowed: admin, denied: finance },
];

describe("RBAC capability matrix", () => {
  it("has an allow and deny case for every capability", () => {
    expect(capabilityCases.map(({ capability }) => capability)).toEqual(CAPABILITIES);
    expect(Object.keys(capabilityMatrix)).toEqual(CAPABILITIES);

    for (const { capability, allowed, denied } of capabilityCases) {
      expect(hasCapability(allowed, capability), `${capability} should allow`).toBe(true);
      expect(hasCapability(denied, capability), `${capability} should deny`).toBe(false);
    }
  });

  it("only grants article management to ADMIN and opted-in STAFF", () => {
    expect(hasCapability(admin, "articles.manage")).toBe(true);
    expect(hasCapability(staffEditor, "articles.manage")).toBe(true);
    expect(hasCapability(staff, "articles.manage")).toBe(false);
    expect(hasCapability(finance, "articles.manage")).toBe(false);
  });

  it("keeps WAREHOUSE outside the admin application", () => {
    expect(getCapabilities(warehouse)).toEqual([]);
    expect(canAccessAdmin(warehouse)).toBe(false);
    expect(getDefaultAdminPath(warehouse)).toBeNull();
  });

  it("derives menus, paths, and landing pages from the same matrix", () => {
    expect(getDefaultAdminPath(admin)).toBe("/admin");
    expect(getDefaultAdminPath(staff)).toBe("/admin/quotes");
    expect(getDefaultAdminPath(finance)).toBe("/admin/quotes");
    expect(canAccessModule(staffEditor, "articles")).toBe(true);
    expect(canAccessModule(staffEditor, "pages")).toBe(false);
    expect(canAccessPath(finance, "/admin/quotes")).toBe(true);
    expect(canAccessPath(finance, "/admin/quotes/example")).toBe(true);
    expect(canAccessPath(finance, "/admin/quotes-archive")).toBe(false);
    expect(canAccessPath(finance, "/admin/settings")).toBe(false);
  });

  it("reloads permissions for every decision so revocation is immediate", async () => {
    let currentSubject = staffEditor;
    let loadCount = 0;
    const loadActor = async () => {
      loadCount += 1;
      return {
        id: "staff-user",
        email: "staff@nexport.test",
        name: "Staff user",
        ...currentSubject,
      };
    };

    await expect(
      authorizeCapability("staff-user", "articles.manage", loadActor),
    ).resolves.toMatchObject({ authorized: true });

    currentSubject = staff;
    await expect(
      authorizeCapability("staff-user", "articles.manage", loadActor),
    ).resolves.toEqual({ authorized: false, reason: "FORBIDDEN" });
    expect(loadCount).toBe(2);
  });
});
