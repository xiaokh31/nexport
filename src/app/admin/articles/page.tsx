"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Eye, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  excerpt: string;
  category: string;
  status: string;
  author: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLocale();

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    PUBLISHED: { label: t.admin.published, variant: "default" },
    DRAFT: { label: t.admin.draft, variant: "secondary" },
    ARCHIVED: { label: t.admin.archived, variant: "outline" },
  };

  const categoryMap: Record<string, string> = {
    industry: t.news?.categories?.industry || "行业资讯",
    service: t.news?.categories?.service || "服务公告",
    company: t.news?.categories?.company || "公司新闻",
    policy: t.news?.categories?.policy || "政策解读",
  };

  // 获取文章列表
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          search: searchTerm,
        });
        
        const response = await fetch(`/api/admin/articles?${params}`);
        if (response.ok) {
          const data = await response.json();
          setArticles(data.articles);
          setTotal(data.total);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "获取文章列表失败");
        }
      } catch (err) {
        setError("获取文章列表失败");
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [page, searchTerm]);

  // 删除文章
  const deleteArticle = async (id: string) => {
    if (!confirm("确定要删除此文章吗？此操作不可撤销。")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/articles?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // 从本地状态中移除文章
        setArticles(articles.filter(article => article.id !== id));
        setTotal(total - 1);
      } else {
        const errorData = await response.json();
        alert(errorData.error || "删除文章失败");
      }
    } catch (err) {
      alert("删除文章失败");
    }
  };

  if (error) {
    return (
      <div className="container py-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t.admin.articles}</h1>
          <p className="text-muted-foreground">{t.admin.articleManagement}</p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/new">
            <Plus className="h-4 w-4 mr-2" />
            {t.admin.newArticle}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.admin.articleList}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.admin.searchArticle}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1); // 重置到第一页
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.admin.articleTitle}</TableHead>
                    <TableHead>{t.admin.category}</TableHead>
                    <TableHead>{t.admin.status}</TableHead>
                    <TableHead>{t.admin.author}</TableHead>
                    <TableHead>{t.admin.publishDate}</TableHead>
                    <TableHead className="text-right">{t.admin.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.length > 0 ? (
                    articles.map((article) => {
                      const status = statusMap[article.status];
                      return (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium max-w-xs truncate">
                            {article.title}
                          </TableCell>
                          <TableCell>{categoryMap[article.category] || article.category}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>{article.author}</TableCell>
                          <TableCell>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => window.open(`/news/${article.id}`, '_blank')}
                                title="预览"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => router.push(`/admin/articles/${article.id}`)}
                                title="编辑"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500"
                                onClick={() => deleteArticle(article.id)}
                                title="删除"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t.messages.noNotifications}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* 分页 */}
              {total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t.common.loading === "Loading..." 
                      ? `Showing ${articles.length} of ${total} articles` 
                      : `显示第 ${(page - 1) * 10 + 1}-${Math.min(page * 10, total)} 条，共 ${total} 条`}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      {t.common.previous}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(total / 10)}
                      onClick={() => setPage(page + 1)}
                    >
                      {t.common.next}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
