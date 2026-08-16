"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceEmpty, WorkspaceLoading, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";
import { useLocale } from "@/i18n/locale-context";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

const copy = {
  zh: {
    eyebrow: "客户工作台",
    description: "处理当前账户收到的真实系统与询价通知。",
    all: "全部",
    failed: "无法读取通知",
    failedHint: "通知列表暂时无法加载，请重新尝试。",
    retry: "重新加载",
    emptyAll: "目前没有通知",
    emptyUnread: "没有未读通知",
    emptyAllHint: "新的账户或询价更新会在发送后出现在这里。",
    emptyUnreadHint: "所有通知都已处理；你可以返回全部通知继续查看。",
    viewQuotes: "查看询价",
    showAll: "显示全部",
    confirmTitle: "删除这条通知？",
    confirmDescription: "删除后无法恢复，但不会影响关联询价的数据。",
    cancel: "取消",
    confirmDelete: "确认删除",
    actionFailed: "操作失败，请稍后重试。",
  },
  en: {
    eyebrow: "Customer workspace",
    description: "Handle real system and quote notifications received by this account.",
    all: "All",
    failed: "Notifications could not be loaded",
    failedHint: "The notification list is temporarily unavailable. Please try again.",
    retry: "Reload",
    emptyAll: "No notifications right now",
    emptyUnread: "No unread notifications",
    emptyAllHint: "New account or quote updates will appear here after they are sent.",
    emptyUnreadHint: "Everything is handled. Return to all notifications to review earlier messages.",
    viewQuotes: "View quotes",
    showAll: "Show all",
    confirmTitle: "Delete this notification?",
    confirmDescription: "It cannot be restored, but the related quote data will not be changed.",
    cancel: "Cancel",
    confirmDelete: "Delete notification",
    actionFailed: "The action failed. Please try again.",
  },
  fr: {
    eyebrow: "Espace client",
    description: "Traitez les notifications système et devis réellement reçues par ce compte.",
    all: "Toutes",
    failed: "Impossible de charger les notifications",
    failedHint: "La liste est momentanément indisponible. Réessayez.",
    retry: "Recharger",
    emptyAll: "Aucune notification pour le moment",
    emptyUnread: "Aucune notification non lue",
    emptyAllHint: "Les nouvelles mises à jour du compte ou des devis apparaîtront ici.",
    emptyUnreadHint: "Tout est traité. Revenez à toutes les notifications pour consulter les messages précédents.",
    viewQuotes: "Voir les devis",
    showAll: "Tout afficher",
    confirmTitle: "Supprimer cette notification ?",
    confirmDescription: "Elle ne pourra pas être restaurée, mais le devis associé ne sera pas modifié.",
    cancel: "Annuler",
    confirmDelete: "Supprimer",
    actionFailed: "L’action a échoué. Réessayez.",
  },
} as const;

export default function NotificationsPage() {
  const { locale, t } = useLocale();
  const content = copy[locale];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [pendingDelete, setPendingDelete] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const unreadParam = filter === "unread" ? "&unread=true" : "";
      const response = await fetch(`/api/notifications?page=${page}&limit=20${unreadParam}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || content.failedHint);
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotal(data.total || 0);
      setPages(Math.max(data.pages || 1, 1));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : content.failedHint);
    } finally {
      setLoading(false);
    }
  }, [content.failedHint, filter, page]);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  async function mutateNotification(body: { notificationId: string } | { markAll: true }) {
    setMutating(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(content.actionFailed);
      if ("markAll" in body) {
        setNotifications((current) => filter === "unread" ? [] : current.map((item) => ({ ...item, isRead: true })));
        if (filter === "unread") setTotal(0);
        setUnreadCount(0);
      } else {
        setNotifications((current) => filter === "unread"
          ? current.filter((item) => item.id !== body.notificationId)
          : current.map((item) => item.id === body.notificationId ? { ...item, isRead: true } : item));
        if (filter === "unread") setTotal((current) => Math.max(0, current - 1));
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : content.actionFailed);
    } finally {
      setMutating(false);
    }
  }

  async function deleteNotification() {
    if (!pendingDelete) return;
    setMutating(true);
    setError(null);
    try {
      const response = await fetch(`/api/notifications?id=${encodeURIComponent(pendingDelete.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(content.actionFailed);
      setNotifications((current) => current.filter((item) => item.id !== pendingDelete.id));
      setTotal((current) => Math.max(0, current - 1));
      if (!pendingDelete.isRead) setUnreadCount((current) => Math.max(0, current - 1));
      setPendingDelete(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : content.actionFailed);
    } finally {
      setMutating(false);
    }
  }

  const typeLabels: Record<string, string> = {
    SYSTEM: t.messages.system,
    QUOTE: t.messages.quote,
    ORDER: t.messages.order,
    PROMOTION: t.messages.promotion,
    NEWS: t.messages.news,
    ALERT: t.messages.alert,
  };

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow={content.eyebrow}
        title={t.messages.notifications}
        description={content.description}
        actions={unreadCount > 0 ? <Button variant="outline" disabled={mutating} onClick={() => void mutateNotification({ markAll: true })}><Check aria-hidden="true" className="mr-2 h-4 w-4" />{t.messages.markAllRead}</Button> : undefined}
      />
      {error && !loading ? <div role="alert" aria-live="assertive" className="border-l-4 border-destructive bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {loading ? <WorkspaceLoading label={t.common.loading} /> : (
        <WorkspacePanel
          title={t.messages.allNotifications}
          description={`${total} · ${unreadCount} ${t.messages.unread}`}
          icon={Bell}
          actions={
            <Tabs value={filter} onValueChange={(value) => { setFilter(value as "all" | "unread"); setPage(1); }}>
              <TabsList><TabsTrigger value="all">{content.all}</TabsTrigger><TabsTrigger value="unread">{t.messages.unread}</TabsTrigger></TabsList>
            </Tabs>
          }
        >
          {notifications.length ? (
            <>
              <ul className="divide-y divide-border border-y border-border">
                {notifications.map((notification) => (
                  <li key={notification.id} className={notification.isRead ? "py-4" : "border-l-4 border-l-signal-amber bg-concrete/35 py-4 pl-3 pr-1 sm:pl-4"}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words font-semibold">{notification.title}</p>
                          <Badge variant="outline">{typeLabels[notification.type] || notification.type}</Badge>
                          {!notification.isRead ? <Badge variant="secondary">{t.messages.new}</Badge> : null}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{notification.content}</p>
                        <time dateTime={notification.createdAt} className="mt-2 block text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</time>
                      </div>
                      <div className="flex shrink-0 gap-2 self-end sm:self-start">
                        {!notification.isRead ? <Button variant="ghost" size="sm" disabled={mutating} aria-label={`${t.messages.markAsRead}：${notification.title}`} onClick={() => void mutateNotification({ notificationId: notification.id })}><Check aria-hidden="true" className="h-4 w-4" /><span className="hidden lg:ml-2 lg:inline">{t.messages.markAsRead}</span></Button> : null}
                        <Button variant="ghost" size="sm" disabled={mutating} className="text-destructive hover:text-destructive" aria-label={`${t.messages.delete}：${notification.title}`} onClick={() => setPendingDelete(notification)}><Trash2 aria-hidden="true" className="h-4 w-4" /><span className="hidden lg:ml-2 lg:inline">{t.messages.delete}</span></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {pages > 1 ? <nav aria-label={t.messages.notifications} className="mt-5 flex items-center justify-between"><span className="text-sm text-muted-foreground">{page} / {pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t.common.previous}</Button><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>{t.common.next}</Button></div></nav> : null}
            </>
          ) : (
            <WorkspaceEmpty
              title={filter === "unread" ? content.emptyUnread : content.emptyAll}
              description={filter === "unread" ? content.emptyUnreadHint : content.emptyAllHint}
              icon={Bell}
              action={filter === "unread" ? <Button variant="outline" onClick={() => setFilter("all")}>{content.showAll}</Button> : <Button variant="outline" asChild><Link href="/user/quotes"><FileText aria-hidden="true" className="mr-2 h-4 w-4" />{content.viewQuotes}</Link></Button>}
            />
          )}
        </WorkspacePanel>
      )}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open && !mutating) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{content.confirmTitle}</DialogTitle><DialogDescription>{content.confirmDescription}</DialogDescription></DialogHeader>
          <div className="border-l-4 border-signal-amber bg-concrete/45 p-3 text-sm"><p className="font-semibold">{pendingDelete?.title}</p></div>
          <DialogFooter>
            <Button variant="outline" disabled={mutating} onClick={() => setPendingDelete(null)}>{content.cancel}</Button>
            <Button variant="destructive" disabled={mutating} onClick={() => void deleteNotification()}>{content.confirmDelete}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
