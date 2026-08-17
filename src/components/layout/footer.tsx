"use client";

import Link from "next/link";
import { Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { siteInfo, siteLinks, solutionConfigs } from "@/config/site-config";
import { getSolutionUiContent } from "@/config/marketing-content";
import { useLocale } from "@/i18n/locale-context";
import { isPlaceholderIdentityValue } from "@/lib/seo/structured-data";

interface ContactLink {
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { locale, t } = useLocale();
  const quickLinks = [
    { title: t.nav.home, href: "/" },
    { title: t.nav.solutions || t.nav.services, href: "/solutions" },
    { title: t.nav.about, href: "/about" },
    { title: t.nav.news, href: "/news" },
    { title: t.nav.contact, href: "/contact" },
  ];
  const contactLinks: ContactLink[] = [
    {
      label: "邮箱",
      value: siteLinks.email,
      href: `mailto:${siteLinks.email}`,
      icon: Mail,
    },
    {
      label: "电话",
      value: siteLinks.phone,
      href: `tel:${siteLinks.phone}`,
      icon: Phone,
    },
    {
      label: "地址",
      value: siteLinks.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteLinks.address)}`,
      icon: MapPin,
      external: true,
    },
  ].filter((item) => !isPlaceholderIdentityValue(item.value));

  return (
    <footer className="border-t-4 border-signal-amber bg-dock-navy text-paper-white">
      <div className="container py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-4">
            <p className="font-display text-2xl font-bold tracking-wide">
              {siteInfo.shortName}
            </p>
            <p className="max-w-sm text-sm leading-7 text-paper-white/75">
              海外仓储、订单履约与运输衔接。
            </p>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center border-b-2 border-signal-amber font-semibold text-paper-white hover:text-signal-amber"
            >
              {t.common.getQuote}
            </Link>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <h2 className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-signal-amber">
              {t.footer.quickLinks}
            </h2>
            <nav aria-label={t.footer.quickLinks} className="grid gap-1">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex min-h-11 items-center text-sm text-paper-white/75 hover:text-paper-white hover:underline"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          <div className={contactLinks.length > 0 ? "space-y-4 lg:col-span-4" : "space-y-4 lg:col-span-6"}>
            <h2 className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-signal-amber">
              {t.solutions?.title || t.footer.ourServices}
            </h2>
            <nav
              aria-label={t.solutions?.title || t.footer.ourServices}
              className="grid gap-x-6 sm:grid-cols-2"
            >
              {solutionConfigs.map(({ key, slug }) => (
                <Link
                  key={slug}
                  href={`/solutions/${slug}`}
                  className="flex min-h-11 items-center text-sm text-paper-white/75 hover:text-paper-white hover:underline"
                >
                  {getSolutionUiContent(locale, key).title}
                </Link>
              ))}
            </nav>
          </div>

          {contactLinks.length > 0 && (
            <div className="space-y-4 lg:col-span-2">
              <h2 className="font-utility text-xs font-semibold uppercase tracking-[0.16em] text-signal-amber">
                {t.footer.contactUs}
              </h2>
              <address className="grid gap-1 not-italic">
                {contactLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className="flex min-h-11 items-start gap-2 py-2 text-sm text-paper-white/75 hover:text-paper-white"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span className="break-words">{item.value}</span>
                    </a>
                  );
                })}
              </address>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-paper-white/20">
        <div className="container flex flex-col gap-4 py-6 text-xs text-paper-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {currentYear} {siteInfo.legalName}. {t.footer.rights}
          </p>
          <nav aria-label="法律信息" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="min-h-11 content-center hover:text-paper-white hover:underline">
              {t.footer.privacy}
            </Link>
            <Link href="/terms" className="min-h-11 content-center hover:text-paper-white hover:underline">
              {t.footer.terms}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
