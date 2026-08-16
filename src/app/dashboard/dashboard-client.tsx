"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, Plus, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserSidebar } from "@/components/user/user-sidebar";
import {
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
  WorkspacePageHeader,
  WorkspacePanel,
} from "@/components/workspace/workspace-ui";
import { getServiceTypeLabel } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

interface DashboardQuote {
  id: string;
  reference: string;
  serviceType: string;
  status: string;
  createdAt: string;
}

interface DashboardNotification {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface DashboardData {
  quotes: DashboardQuote[];
  quoteTotal: number;
  notifications: DashboardNotification[];
  unreadCount: number;
}

const copy = {
  zh: {
    eyebrow: "客户工作台",
    description: "这里只汇总当前账户的真实询价和消息通知。",
    quoteTotal: "询价总数",
    unread: "未读通知",
    recentQuotes: "最近询价",
    recentNotifications: "最近通知",
    quoteHint: "按提交时间查看最近的询价状态。",
    notificationHint: "与账户和询价有关的最新消息。",
    noQuotes: "还没有询价记录",
    noQuotesHint: "提交第一条询价后，编号和处理状态会显示在这里。",
    noNotifications: "目前没有通知",
    noNotificationsHint: "新的账户或询价更新会出现在这里。",
    failed: "无法读取工作台",
    failedHint: "询价或通知暂时无法加载，请稍后重试。",
    retry: "重新加载",
    all: "查看全部",
  },
  en: {
    eyebrow: "Customer workspace",
    description: "This view only summarizes real quotes and notifications for the current account.",
    quoteTotal: "Total quotes",
    unread: "Unread notifications",
    recentQuotes: "Recent quotes",
    recentNotifications: "Recent notifications",
    quoteHint: "Recent quote statuses ordered by submission time.",
    notificationHint: "Latest updates related to your account and quotes.",
    noQuotes: "No quote records yet",
    noQuotesHint: "Submit your first quote to see its reference and processing status here.",
    noNotifications: "No notifications right now",
    noNotificationsHint: "New account or quote updates will appear here.",
    failed: "Workspace could not be loaded",
    failedHint: "Quotes or notifications are temporarily unavailable. Please try again.",
    retry: "Reload",
    all: "View all",
  },
  fr: {
    eyebrow: "Espace client",
    description: "Cette vue récapitule uniquement les devis et notifications réels du compte courant.",
    quoteTotal: "Total des devis",
    unread: "Notifications non lues",
    recentQuotes: "Devis récents",
    recentNotifications: "Notifications récentes",
    quoteHint: "Statuts récents classés par date d’envoi.",
    notificationHint: "Dernières mises à jour liées au compte et aux devis.",
    noQuotes: "Aucune demande de devis",
    noQuotesHint: "Envoyez votre première demande pour voir sa référence et son statut ici.",
    noNotifications: "Aucune notification pour le moment",
    noNotificationsHint: "Les nouvelles mises à jour du compte ou des devis apparaîtront ici.",
    failed: "Impossible de charger l’espace client",
    failedHint: "Les devis ou notifications sont momentanément indisponibles. Réessayez.",
    retry: "Recharger",
    all: "Tout voir",
  },
} as const;

export function DashboardClient() {
  const { locale, t } = useLocale();
  const content = copy[locale];
  const statusLabels = t.notifications.statusLabels as Record<string, string>;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [quotesResponse, notificationsResponse] = await Promise.all([
        fetch("/api/user/quotes?page=1&limit=5", { cache: "no-store" }),
        fetch("/api/notifications?page=1&limit=5", { cache: "no-store" }),
      ]);
      if (!quotesResponse.ok || !notificationsResponse.ok) throw new Error("dashboard request failed");
      const [quotes, notifications] = await Promise.all([
        quotesResponse.json(),
        notificationsResponse.json(),
      ]);
      setData({
        quotes: quotes.quotes || [],
        quoteTotal: quotes.total || 0,
        notifications: notifications.notifications || [],
        unreadCount: notifications.unreadCount || 0,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="bg-concrete/55 py-6 lg:py-8">
      <div className="container flex flex-col gap-6 lg:flex-row lg:gap-8">
        <UserSidebar />
        <section aria-label={content.eyebrow} className="min-w-0 flex-1 space-y-6">
          <WorkspacePageHeader
            eyebrow={content.eyebrow}
            title={t.dashboard.title}
            description={content.description}
            actions={
              <>
                <Button asChild>
                  <Link href="/contact"><Plus aria-hidden="true" className="mr-2 h-4 w-4" />{t.dashboard.newQuote}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/user/profile"><User aria-hidden="true" className="mr-2 h-4 w-4" />{t.dashboard.editProfile}</Link>
                </Button>
              </>
            }
          />

          {loading ? <WorkspaceLoading label={t.common.loading} /> : null}
          {!loading && error ? (
            <WorkspaceError
              title={content.failed}
              description={content.failedHint}
              action={<Button variant="outline" onClick={() => void loadDashboard()}>{content.retry}</Button>}
            />
          ) : null}
          {!loading && !error && data ? (
            <>
              <dl className="grid gap-px border-2 border-dock-navy bg-dock-navy sm:grid-cols-2">
                <div className="bg-paper-white p-5">
                  <dt className="font-utility text-xs uppercase tracking-[0.14em] text-steel-blue">{content.quoteTotal}</dt>
                  <dd className="font-display mt-2 text-4xl font-bold">{data.quoteTotal}</dd>
                </div>
                <div className="bg-paper-white p-5">
                  <dt className="font-utility text-xs uppercase tracking-[0.14em] text-steel-blue">{content.unread}</dt>
                  <dd className="font-display mt-2 text-4xl font-bold">{data.unreadCount}</dd>
                </div>
              </dl>

              <div className="grid gap-6 xl:grid-cols-2">
                <WorkspacePanel
                  title={content.recentQuotes}
                  description={content.quoteHint}
                  icon={FileText}
                  actions={<Button variant="ghost" size="sm" asChild><Link href="/user/quotes">{content.all}</Link></Button>}
                >
                  {data.quotes.length ? (
                    <ul className="divide-y divide-border">
                      {data.quotes.map((quote) => (
                        <li key={quote.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="font-utility text-xs font-semibold text-steel-blue">{quote.reference}</p>
                            <p className="mt-1 truncate text-sm font-medium">{getServiceTypeLabel(quote.serviceType, t)}</p>
                          </div>
                          <Badge variant="outline">{statusLabels[quote.status] || quote.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <WorkspaceEmpty
                      title={content.noQuotes}
                      description={content.noQuotesHint}
                      icon={FileText}
                      action={<Button asChild><Link href="/contact">{t.dashboard.newQuote}</Link></Button>}
                    />
                  )}
                </WorkspacePanel>

                <WorkspacePanel
                  title={content.recentNotifications}
                  description={content.notificationHint}
                  icon={Bell}
                  actions={<Button variant="ghost" size="sm" asChild><Link href="/user/notifications">{content.all}</Link></Button>}
                >
                  {data.notifications.length ? (
                    <ul className="divide-y divide-border">
                      {data.notifications.map((notification) => (
                        <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start gap-3">
                            <span aria-label={notification.isRead ? t.messages.read : t.messages.unread} className={notification.isRead ? "mt-2 h-2 w-2 shrink-0 bg-border" : "mt-2 h-2 w-2 shrink-0 bg-signal-amber"} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{notification.title}</p>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{notification.content}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <WorkspaceEmpty title={content.noNotifications} description={content.noNotificationsHint} icon={Bell} />
                  )}
                </WorkspacePanel>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
