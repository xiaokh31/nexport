"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocale } from "@/i18n/locale-context";

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
}

export default function NotificationsPage() {
  const { t } = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const unreadParam = filter === 'unread' ? '&unread=true' : '';
      const response = await fetch(`/api/notifications?page=${page}&limit=20${unreadParam}`);
      if (response.ok) {
        const data: NotificationResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      
      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setTotal(prev => prev - 1);
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('删除通知失败:', error);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'SYSTEM': t.messages?.system || '系统通知',
      'QUOTE': t.messages?.quote || '询价相关',
      'ORDER': t.messages?.order || '订单相关',
      'PROMOTION': t.messages?.promotion || '促销活动',
      'NEWS': t.messages?.news || '新闻动态',
      'ALERT': t.messages?.alert || '警告通知',
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'SYSTEM': return 'bg-blue-500';
      case 'QUOTE': return 'bg-green-500';
      case 'ORDER': return 'bg-purple-500';
      case 'PROMOTION': return 'bg-orange-500';
      case 'NEWS': return 'bg-cyan-500';
      case 'ALERT': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t.messages?.notifications || '消息通知'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.messages?.allNotifications || '所有通知'} ({total})
            {unreadCount > 0 && (
              <span className="ml-2 text-primary">
                {unreadCount} {t.messages?.unread || '未读'}
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-2" />
            {t.messages?.markAllRead || '全部已读'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t.messages?.notifications || '通知列表'}
            </CardTitle>
            <Tabs value={filter} onValueChange={(v) => { setFilter(v as 'all' | 'unread'); setPage(1); }}>
              <TabsList>
                <TabsTrigger value="all">{t.admin?.all || '全部'}</TabsTrigger>
                <TabsTrigger value="unread">{t.messages?.unread || '未读'}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              {t.common?.loading || '加载中...'}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {t.messages?.noNotifications || '暂无通知'}
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.isRead ? 'bg-accent/50 border-primary/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${getTypeColor(notification.type)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{notification.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {!notification.isRead && (
                          <Badge variant="secondary" className="text-xs">
                            {t.messages?.new || '新'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.content}
                      </p>
                      <span className="text-xs text-muted-foreground mt-2 block">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t.common?.previous || '上一页'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
              >
                {t.common?.next || '下一页'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
