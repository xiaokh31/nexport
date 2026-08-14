const verifiedAt = new Date("2026-01-01T00:00:00.000Z");

function fixtureUser(id, role, canManageArticles = false) {
  return Object.freeze({
    id: `fixture-${id}`,
    name: `Fixture ${id}`,
    email: `${id}@nexport.test`,
    emailVerified: verifiedAt,
    password: null,
    role,
    canManageArticles,
  });
}

export const fixtureUsers = Object.freeze([
  fixtureUser("admin", "ADMIN"),
  fixtureUser("staff-editor", "STAFF", true),
  fixtureUser("staff-no-editor", "STAFF", false),
  fixtureUser("finance", "FINANCE"),
  fixtureUser("warehouse", "WAREHOUSE"),
  fixtureUser("customer", "CUSTOMER"),
  fixtureUser("partner", "PARTNER"),
]);

export const fixtureUserIds = Object.freeze(
  Object.fromEntries(fixtureUsers.map((user) => [user.email.split("@")[0], user.id])),
);
