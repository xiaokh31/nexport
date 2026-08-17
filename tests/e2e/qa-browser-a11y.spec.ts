import { expect, test, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      errors.push(`image ${response.status()}: ${response.url()}`);
    }
  });

  return errors;
}

async function authenticateAdmin(page: Page) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for QA-003 E2E tests");
  const sessionToken = await encode({
    secret,
    token: {
      id: "fixture-admin",
      sub: "fixture-admin",
      role: "ADMIN",
      canManageArticles: false,
    },
  });
  await page.context().addCookies([
    { name: "next-auth.session-token", value: sessionToken, url: baseURL },
  ]);
}

test("French preference keeps the document language and long copy contained after reload", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("site-locale"));
  await page.reload();

  await page.getByRole("button", { name: /^切换语言/ }).click();
  await page.getByRole("menuitemradio", { name: "Français", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");

  await page.goto("/contact?service=WAREHOUSE");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  expect(errors).toEqual([]);
});

test("form labels keep stable control ids and authenticated desktop hydration stays clean", async ({ page }) => {
  const errors = collectBrowserErrors(page);

  for (const path of ["/login", "/register", "/contact?service=WAREHOUSE"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const associations = await page.locator("label[for]").evaluateAll((labels) =>
      labels.map((label) => {
        const target = label.getAttribute("for") || "";
        return { target, exists: Boolean(document.getElementById(target)) };
      }),
    );
    expect(associations.length, `${path} should expose label/control associations`).toBeGreaterThan(0);
    expect(associations.every(({ target, exists }) => target && exists), path).toBe(true);
    expect(
      associations.filter(({ target }) => target.includes("form-field-")),
      `${path} should use stable form field ids`,
    ).not.toHaveLength(0);
  }

  await authenticateAdmin(page);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/admin/articles");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "文章管理", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(1920);
  expect(errors).toEqual([]);
});

test("200 percent page scale and reduced motion preserve a usable contact page", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");

  const maximumMotionDuration = await page.evaluate(() =>
    Array.from(document.querySelectorAll("*")).reduce((maximum, node) => {
      const style = getComputedStyle(node);
      const durations = [
        ...style.animationDuration.split(","),
        ...style.transitionDuration.split(","),
      ].map((value) => {
        const duration = Number.parseFloat(value);
        return value.trim().endsWith("ms") ? duration : duration * 1_000;
      }).filter(Number.isFinite);
      return Math.max(maximum, ...durations, 0);
    }, 0),
  );
  expect(maximumMotionDuration).toBeLessThanOrEqual(0.011);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
  const zoom = await page.evaluate(() => ({
    scale: window.visualViewport?.scale || 1,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(zoom.scale).toBeGreaterThanOrEqual(1.99);
  expect(zoom.overflow).toBeLessThanOrEqual(1);
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  expect(errors).toEqual([]);
});
