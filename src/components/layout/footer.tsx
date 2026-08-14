"use client";

import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { getSiteConfig, solutionConfigs, socialLinks, partnerLinks } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

// 社交媒体图标组件
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLocale();
  const siteConfig = getSiteConfig(t);

  // 从翻译文件动态获取快速链接
  const quickLinks = [
    { title: t.nav.home, href: "/" },
    { title: t.nav.solutions || t.nav.services, href: "/solutions" },
    { title: t.nav.about, href: "/about" },
    { title: t.nav.news, href: "/news" },
    { title: t.nav.contact, href: "/contact" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">{siteConfig.name}</h3>
            <p className="text-sm opacity-80">
              {t.about.description || "专业的跨境物流解决方案提供商 - FBA、一件代发、退货换标服务"}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t.footer.quickLinks}</h4>
            <nav className="flex flex-col space-y-2">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm opacity-80 hover:opacity-100 hover:underline"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>

          {/* Services - 更新为解决方案，使用 solutionConfigs */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t.solutions?.title || t.footer.ourServices}</h4>
            <nav className="flex flex-col space-y-2">
              {solutionConfigs.map(({ key, slug }) => (
                <Link
                  key={slug}
                  href={`/solutions/${slug}`}
                  className="text-sm opacity-80 hover:opacity-100 hover:underline"
                >
                  {(t.solutions?.[key] as { title: string } | undefined)?.title || key}
                </Link>
              ))}
            </nav>
          </div>

          {/* Friendly Links - 友情链接 */}
          {partnerLinks.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">{t.footer.friendlyLinks}</h4>
              <nav className="flex flex-col space-y-2">
                {partnerLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm opacity-80 hover:opacity-100 hover:underline"
                  >
                    {link.name}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">{t.footer.contactUs}</h4>
            <div className="space-y-3">
              <a
                href={`mailto:${siteConfig.links.email}`}
                className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
              >
                <Mail className="h-4 w-4" />
                {siteConfig.links.email}
              </a>
              <a
                href={`tel:${siteConfig.links.phone}`}
                className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100"
              >
                <Phone className="h-4 w-4" />
                {siteConfig.links.phone}
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.links.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm opacity-80 hover:opacity-100 hover:underline"
              >
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{siteConfig.links.address}</span>
              </a>
              
              {/* Social Media Icons */}
              <div className="flex items-center gap-3 pt-2">
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="LinkedIn"
                  >
                    <LinkedInIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="YouTube"
                  >
                    <YouTubeIcon className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-80 hover:opacity-100 transition-opacity"
                    aria-label="X (Twitter)"
                  >
                    <XIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
  
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/20">
        <div className="container py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-80">
            <p>
              &copy; {currentYear} {siteConfig.name}. {t.footer.rights}
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:underline">
                {t.footer.privacy}
              </Link>
              <Link href="/terms" className="hover:underline">
                {t.footer.terms}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
