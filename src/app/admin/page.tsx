"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Users, TrendingUp, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { getServiceTypeLabel } from "@/config/site-config";

interface Stats {
  users: { total: number; today: number; change: string };
  quotes: { total: number; today: number; change: string };
  articles: { total: number; today: number; change: string };
  notifications: { total: number; today: number; change: string };
}

interface RecentQuote {
  id: string;
  name: string;
  serviceType: string;
  createdAt: string;
}

interface RecentArticle {
  id: string;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [recentArticles, setRecentArticles] = useState<RecentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setRecentQuotes(data.recentQuotes || []);
          setRecentArticles(data.recentArticles || []);
        } else {
          const errData = await response.json();
          setError(errData.error || '获取统计数据失败');
        }
      } catch (err) {
        setError('获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 格式化时间
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursAgoText = t.admin?.hoursAgo || "小时前";
    const daysAgoText = t.admin?.daysAgo || "天前";
    
    if (diffHours < 1) {
      return "刚刚";
    } else if (diffHours < 24) {
      return `${diffHours} ${hoursAgoText}`;
    } else {
      return `${diffDays} ${daysAgoText}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  const statsConfig = [
    { 
      icon: MessageSquare, 
      label: t.admin?.todayQuotes || "今日询价", 
      value: stats?.quotes.today.toString() || "0",
      total: stats?.quotes.total.toString() || "0",
      change: stats?.quotes.change || "0",
      color: "text-blue-500" 
    },
    { 
      icon: Users, 
      label: t.admin?.registeredUsers || "注册用户", 
      value: stats?.users.total.toString() || "0",
      total: stats?.users.total.toString() || "0",
      change: stats?.users.change || "0",
      color: "text-green-500" 
    },
    { 
      icon: FileText, 
      label: t.admin?.publishedArticles || "已发布文章", 
      value: stats?.articles.total.toString() || "0",
      total: stats?.articles.total.toString() || "0",
      change: stats?.articles.change || "0",
      color: "text-purple-500" 
    },
    { 
      icon: TrendingUp,
      label: t.admin?.unreadNotifications || "未读通知",
      value: stats?.notifications.total.toString() || "0",
      total: stats?.notifications.total.toString() || "0",
      change: stats?.notifications.change || "0",
      color: "text-orange-500" 
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.admin?.title || "管理后台"}</h1>
        <p className="text-muted-foreground">{t.admin?.welcome || "欢迎使用管理后台"}</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${stat.change.startsWith('+') && stat.change !== '+0' ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {stat.change} {t.admin?.comparedYesterday || "较昨日"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin?.recentQuotes || "最近询价"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{quote.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getServiceTypeLabel(quote.serviceType, t)}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(quote.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  暂无询价记录
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin?.latestArticles || "最新文章"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentArticles.length > 0 ? (
                recentArticles.map((article) => (
                  <div key={article.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium line-clamp-1">{article.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {article.status === 'PUBLISHED' ? (t.admin?.published || "已发布") : (t.admin?.draft || "草稿")}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatTimeAgo(article.publishedAt || article.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  暂无文章
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
