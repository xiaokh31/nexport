import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(path.resolve(relativePath), "utf8");
}

function hexToken(css: string, token: string) {
  const match = css.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6});`, "i"));
  if (!match) throw new Error(`Missing CSS color token: ${token}`);
  return match[1];
}

function relativeLuminance(hex: string) {
  const channels = hex.slice(1).match(/../g)?.map((value) => parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error(`Invalid color: ${hex}`);
  const [red, green, blue] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
}

describe("UI-001 foundation boundaries", () => {
  it("defines the warehouse palette, typography, status, and sidebar tokens", () => {
    const css = source("src/app/globals.css");

    for (const token of [
      "--dock-navy: #102632",
      "--steel-blue: #375566",
      "--concrete: #edf0ec",
      "--signal-amber: #f2a900",
      "--pallet-kraft: #b88958",
      "--paper-white: #fafbf8",
      "--success:",
      "--warning:",
      "--destructive:",
      "--sidebar:",
      "--sidebar-accent:",
    ]) {
      expect(css, token).toContain(token);
    }
    expect(css).toContain('"Barlow Condensed"');
    expect(css).toContain('"Noto Sans SC"');
    expect(css).toContain('"IBM Plex Mono"');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).not.toContain("oklch(");
  });

  it("uses stable font fallbacks and exposes a skip link to one global main", () => {
    const layout = source("src/app/layout.tsx");
    const adminLayout = source("src/app/admin/layout.tsx");
    const userLayout = source("src/app/user/layout.tsx");

    expect(layout).not.toContain("next/font/google");
    expect(layout).not.toContain("Geist");
    expect(layout).toContain('href="#main-content"');
    expect(layout).toContain('<main id="main-content"');
    expect(adminLayout).not.toContain("<main");
    expect(userLayout).not.toContain("<main");
  });

  it("keeps core text and control boundaries above their contrast targets", () => {
    const css = source("src/app/globals.css");

    expect(contrastRatio(hexToken(css, "dock-navy"), hexToken(css, "paper-white")))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToken(css, "steel-blue"), hexToken(css, "paper-white")))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToken(css, "signal-amber"), hexToken(css, "dock-navy")))
      .toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToken(css, "input"), hexToken(css, "card")))
      .toBeGreaterThanOrEqual(3);
  });

  it("keeps one language switcher and gives the mobile navigation an accessible title", () => {
    const header = source("src/components/layout/header.tsx");
    const language = source("src/components/layout/language-switcher.tsx");
    const localeContext = source("src/i18n/locale-context.tsx");

    expect(header.match(/<LanguageSwitcher/g)).toHaveLength(1);
    expect(header).toContain("<SheetTitle");
    expect(header).toContain("closeLabel={t.common.closeMenu}");
    expect(header).toContain('aria-label={t.common.openMenu}');
    expect(header).toContain('className="hidden xl:flex"');
    expect(header).toContain("isLoggedIn && mounted");
    expect(header).toContain("{mounted ? (");
    expect(language).toContain("DropdownMenuRadioGroup");
    expect(language).toContain("t.common.switchLanguage");
    expect(language).toContain("if (!mounted)");
    expect(localeContext).toContain("applyDocumentLanguage(savedLocale)");
    expect(localeContext).toContain("applyDocumentLanguage(newLocale)");
  });

  it("does not expose placeholder contacts or unauthorized partner links in the shell", () => {
    const header = source("src/components/layout/header.tsx");
    const footer = source("src/components/layout/footer.tsx");

    expect(header).not.toContain("mailto:");
    expect(header).not.toContain("tel:");
    expect(footer).toContain("isPlaceholderIdentityValue");
    expect(footer).not.toContain("partnerLinks");
    expect(footer).toContain("海外仓储、订单履约与运输衔接。");
  });

  it("applies visible focus, 44px controls, and shared workspace sidebar tokens", () => {
    const css = source("src/app/globals.css");
    const button = source("src/components/ui/button.tsx");
    const input = source("src/components/ui/input.tsx");
    const textarea = source("src/components/ui/textarea.tsx");
    const select = source("src/components/ui/select.tsx");
    const adminSidebar = source("src/components/admin/admin-sidebar.tsx");
    const userSidebar = source("src/components/user/user-sidebar.tsx");

    expect(css).toContain("box-shadow: 0 0 0 2px var(--signal-amber)");
    expect(button).toContain('default: "h-11');
    expect(button).toContain("bg-signal-amber text-dock-navy");
    expect(input).toContain("h-11");
    expect(textarea).toContain("min-h-28");
    expect(select).toContain("data-[size=default]:h-11");
    for (const sidebar of [adminSidebar, userSidebar]) {
      expect(sidebar).toContain("bg-sidebar");
      expect(sidebar).toContain("border-signal-amber");
      expect(sidebar).toContain("min-h-11");
    }
  });

  it("keeps shared form label and description ids stable across hydration", () => {
    const form = source("src/components/ui/form.tsx");

    expect(form).toContain("form-field-${String(name)");
    expect(form).not.toContain("React.useId()");
    expect(form).toContain("htmlFor={formItemId}");
    expect(form).toContain("aria-describedby=");
  });
});
