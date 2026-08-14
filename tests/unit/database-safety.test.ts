import { describe, expect, it } from "vitest";
import {
  assertTestRuntime,
  resolvePlaywrightBaseUrl,
  resolveTestDatabaseSettings,
  UnsafeTestDatabaseError,
} from "../../scripts/test/database-safety.mjs";

const marker = "nexport-test-only";

function testEnvironment(databaseUrl: string) {
  return {
    NODE_ENV: "test",
    DATABASE_URL_TEST: databaseUrl,
    TEST_DATABASE_MARKER: marker,
  };
}

describe("test database safety", () => {
  it("accepts the isolated local test URL", () => {
    const settings = resolveTestDatabaseSettings(testEnvironment(
      "postgresql://nexport_test:password@127.0.0.1:55432/nexport_test?application_name=nexport-test-only",
    ));

    expect(settings.databaseName).toBe("nexport_test");
    expect(settings.port).toBe(55432);
  });

  it.each([
    "postgresql://nexport_test:password@127.0.0.1:55432/nexport?application_name=nexport-test-only",
    "postgresql://nexport_test:password@127.0.0.1:5432/nexport_test?application_name=nexport-test-only",
    "postgresql://nexport_test:password@database.example.com:55432/nexport_test?application_name=nexport-test-only",
    "postgresql://nexport:password@127.0.0.1:55432/nexport_test?application_name=nexport-test-only",
    "postgresql://nexport_test@127.0.0.1:55432/nexport_test?application_name=nexport-test-only",
    "postgresql://nexport_test:password@127.0.0.1:55432/nexport_test?application_name=wrong",
  ])("rejects an unsafe destructive target: %s", (databaseUrl) => {
    expect(() => resolveTestDatabaseSettings(testEnvironment(databaseUrl))).toThrow(
      UnsafeTestDatabaseError,
    );
  });

  it("requires an explicit marker for a custom URL", () => {
    expect(() => resolveTestDatabaseSettings({
      DATABASE_URL_TEST:
        "postgresql://nexport_test:password@127.0.0.1:55432/nexport_test?application_name=nexport-test-only",
    })).toThrow(UnsafeTestDatabaseError);
  });

  it("rejects fixtures outside NODE_ENV=test", () => {
    expect(() => assertTestRuntime({
      ...testEnvironment(
        "postgresql://nexport_test:password@127.0.0.1:55432/nexport_test?application_name=nexport-test-only",
      ),
      NODE_ENV: "production",
    })).toThrow("NODE_ENV=test");
  });

  it("keeps Playwright on the dedicated local origin", () => {
    expect(resolvePlaywrightBaseUrl({})).toBe("http://127.0.0.1:3100");
    expect(() => resolvePlaywrightBaseUrl({
      PLAYWRIGHT_BASE_URL: "https://www.example.com",
    })).toThrow(UnsafeTestDatabaseError);
    expect(() => resolvePlaywrightBaseUrl({
      PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
    })).toThrow(UnsafeTestDatabaseError);
  });
});
