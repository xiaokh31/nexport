"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, MessageSquare, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";
import { useLocale } from "@/i18n/locale-context";
import { getServiceTypeLabel } from "@/config/site-config";

interface Stats {
  users: { total: number; today: number; change: string };
  quotes: { total: number; today: number; change: string };
  articles: { total: number; today: number; change: string };
  notifications: { total: number; today: number; change: string };
}
interface RecentQuote { id: string; name: string; serviceType: string; createdAt: string }
interface RecentArticle { id: string; title: string; status: string; publishedAt: string | null; createdAt: string }

export default function AdminPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!response.ok) throw new Error("admin stats failed");
      const data = await response.json();
      setStats(data.stats);
      setRecentQuotes(data.recentQuotes || []);
      setRecentArticles(data.recentArticles || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  const metrics = stats ? [
    [t.admin?.todayQuotes || "今日询价", stats.quotes.today, `累计 ${stats.quotes.total}`, MessageSquare],
    [t.admin?.registeredUsers || "注册用户", stats.users.total, `今日新增 ${stats.users.today}`, Users],
    [t.admin?.publishedArticles || "已发布文章", stats.articles.total, `今日新增 ${stats.articles.today}`, FileText],
    [t.admin?.unreadNotifications || "未读通知", stats.notifications.total, `今日发送 ${stats.notifications.today}`, Bell],
  ] as const : [];

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="后台工作台"
        title={t.admin?.title || "管理后台"}
        description="查看数据库中的真实用户、询价、已发布文章和未读通知。"
      />
      {loading ? <WorkspaceLoading label={t.common.loading} /> : null}
      {!loading && error ? <WorkspaceError title="无法读取后台概览" description="统计与最近记录暂时无法加载，请重新尝试。" action={<Button variant="outline" onClick={() => void loadStats()}>重新加载</Button>} /> : null}
      {!loading && !error && stats ? (
        <>
          <dl className="grid gap-px border-2 border-dock-navy bg-dock-navy sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, note, Icon]) => (
              <div key={label} className="bg-paper-white p-5">
                <div className="flex items-start justify-between gap-3"><dt className="font-utility text-xs uppercase tracking-[0.12em] text-steel-blue">{label}</dt><Icon aria-hidden="true" className="h-4 w-4 text-steel-blue" /></div>
                <dd className="font-display mt-3 text-4xl font-bold">{value}</dd>
                <p className="mt-1 text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </dl>

          <div className="grid gap-6 xl:grid-cols-2">
            <WorkspacePanel title={t.admin?.recentQuotes || "最近询价"} description="按提交时间显示最近五条记录。" icon={MessageSquare} actions={<Button variant="ghost" size="sm" asChild><Link href="/admin/quotes">查看全部</Link></Button>}>
              {recentQuotes.length ? <ul className="divide-y divide-border">{recentQuotes.map((quote) => <li key={quote.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{quote.name}</p><p className="text-sm text-muted-foreground">{getServiceTypeLabel(quote.serviceType, t)}</p></div><time dateTime={quote.createdAt} className="shrink-0 text-xs text-muted-foreground">{formatTime(quote.createdAt)}</time></li>)}</ul> : <WorkspaceEmpty title="暂无询价记录" description="客户提交询价后会显示在这里；也可进入询价管理检查筛选条件。" icon={MessageSquare} action={<Button variant="outline" asChild><Link href="/admin/quotes">进入询价管理</Link></Button>} />}
            </WorkspacePanel>
            <WorkspacePanel title={t.admin?.latestArticles || "最新文章"} description="只显示最近发布的五篇文章。" icon={FileText} actions={<Button variant="ghost" size="sm" asChild><Link href="/admin/articles">查看全部</Link></Button>}>
              {recentArticles.length ? <ul className="divide-y divide-border">{recentArticles.map((article) => <li key={article.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{article.title}</p><p className="text-sm text-muted-foreground">{article.status === "PUBLISHED" ? (t.admin?.published || "已发布") : (t.admin?.draft || "草稿")}</p></div><time dateTime={article.publishedAt || article.createdAt} className="shrink-0 text-xs text-muted-foreground">{formatTime(article.publishedAt || article.createdAt)}</time></li>)}</ul> : <WorkspaceEmpty title="暂无已发布文章" description="创建并发布第一篇文章后会显示在这里。" icon={FileText} action={<Button asChild><Link href="/admin/articles/new"><Plus aria-hidden="true" className="mr-2 h-4 w-4" />新建文章</Link></Button>} />}
            </WorkspacePanel>
          </div>
        </>
      ) : null}
    </div>
  );
}
