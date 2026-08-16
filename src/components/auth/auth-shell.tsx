"use client";

import { FileText, Bell, Settings } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

const copy = {
  zh: {
    eyebrow: "账户访问",
    title: "把每次询价放回同一条工作流。",
    description: "登录后只展示与当前账户关联的询价、通知和资料设置。",
    items: [
      ["询价记录", "按真实状态查看已提交的需求与报价。"],
      ["消息通知", "集中处理与账户和询价相关的更新。"],
      ["账户设置", "维护联系资料、语言与邮件偏好。"],
    ],
  },
  en: {
    eyebrow: "Account access",
    title: "Keep every quote in one working queue.",
    description: "Once signed in, you only see quotes, notifications, and settings tied to your account.",
    items: [
      ["Quote records", "Follow submitted requests and real quote statuses."],
      ["Notifications", "Handle account and quote updates in one place."],
      ["Account settings", "Maintain contact details, language, and email preferences."],
    ],
  },
  fr: {
    eyebrow: "Accès au compte",
    title: "Regroupez chaque devis dans une même file de travail.",
    description: "Après connexion, seuls les devis, notifications et réglages liés à votre compte sont affichés.",
    items: [
      ["Demandes de devis", "Suivez les demandes envoyées et leurs statuts réels."],
      ["Notifications", "Traitez les mises à jour du compte et des devis au même endroit."],
      ["Réglages du compte", "Gérez vos coordonnées, la langue et les préférences e-mail."],
    ],
  },
} as const;

const icons = [FileText, Bell, Settings];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const content = copy[locale];

  return (
    <section className="bg-concrete/55 px-4 py-8 sm:py-12 lg:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden border-2 border-dock-navy bg-paper-white lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative bg-dock-navy p-6 text-paper-white sm:p-9 lg:p-12">
          <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1 bg-signal-amber" />
          <p className="font-utility text-xs font-semibold uppercase tracking-[0.18em] text-signal-amber">
            {content.eyebrow}
          </p>
          <h1 className="font-display mt-5 max-w-xl text-4xl font-bold leading-none tracking-tight sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-paper-white/72 sm:text-base">
            {content.description}
          </p>
          <ul className="mt-8 space-y-5 border-t border-sidebar-border pt-6">
            {content.items.map(([title, description], index) => {
              const Icon = icons[index];
              return (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-sidebar-border text-signal-amber">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-paper-white/65">{description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="flex items-center p-5 sm:p-9 lg:p-12">
          <div className="mx-auto w-full max-w-lg">{children}</div>
        </div>
      </div>
    </section>
  );
}
