"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  publishedAt: string | null;
  createdAt: string;
}

export default function NewsPage() {
  const { t } = useLocale();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const newsCategories = t.news?.categories as Record<string, string> | undefined;
  const categories: Record<string, string> = {
    all: "全部",
    company: newsCategories?.company || "公司新闻",
    industry: newsCategories?.industry || "行业资讯",
    service: newsCategories?.service || "服务公告",
    policy: newsCategories?.policy || "政策解读",
  };

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (selectedCategory !== 'all') {
          params.set('category', selectedCategory);
        }
        
        const response = await fetch(`/api/articles?${params}`);
        if (response.ok) {
          const data = await response.json();
          setArticles(data.articles);
          setTotalPages(data.pages);
        } else {
          setError('获取文章列表失败');
        }
      } catch (err) {
        setError('获取文章列表失败');
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [page, selectedCategory]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              {t.news?.title || "新闻动态"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t.news?.subtitle || "了解公司的最新动态、行业资讯和政策解读"}
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(categories).map(([key, label]) => (
              <Button
                key={key}
                variant={selectedCategory === key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategory(key);
                  setPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* News List */}
      <section className="py-16 md:py-24">
        <div className="container">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : articles.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                {articles.map((article) => (
                  <Card key={article.id} className="group hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {categories[article.category] || article.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(article.publishedAt || article.createdAt)}
                        </div>
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        <Link href={`/news/${article.slug || article.id}`}>
                          {article.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="line-clamp-2 mb-4">
                        {article.excerpt}
                      </CardDescription>
                      <Link 
                        href={`/news/${article.slug || article.id}`}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        {t.common?.readMore || "阅读更多"}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    {t.common?.previous || "上一页"}
                  </Button>
                  <span className="flex items-center px-4">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    {t.common?.next || "下一页"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">暂无文章</p>
              <p className="text-sm mt-2">请稍后再来查看</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
