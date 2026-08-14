"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  author: string;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useLocale();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const newsCategories = t.news?.categories as Record<string, string> | undefined;
  const categories: Record<string, string> = {
    company: newsCategories?.company || "公司新闻",
    industry: newsCategories?.industry || "行业资讯",
    service: newsCategories?.service || "服务公告",
    policy: newsCategories?.policy || "政策解读",
  };

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        // 先尝试用slug查询，如果失败则用id查询
        let response = await fetch(`/api/articles?slug=${encodeURIComponent(slug)}`);
        
        if (!response.ok) {
          // 尝试用id查询
          response = await fetch(`/api/articles?id=${encodeURIComponent(slug)}`);
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.article) {
            setArticle(data.article);
          } else {
            setError('文章不存在');
          }
        } else {
          const errData = await response.json();
          setError(errData.error || '文章不存在');
        }
      } catch (err) {
        setError('加载文章失败');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container py-16 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">文章不存在</h1>
          <p className="text-muted-foreground mb-6">{error || '您访问的文章可能已被删除或尚未发布'}</p>
          <Button asChild>
            <Link href="/news">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回新闻列表
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <Button variant="ghost" asChild className="mb-6">
              <Link href="/news">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回新闻列表
              </Link>
            </Button>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">
                {categories[article.category] || article.category}
              </Badge>
              {article.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {article.author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(article.publishedAt || article.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cover Image */}
      {article.coverImage && (
        <section className="container py-8">
          <div className="max-w-4xl mx-auto">
            <img
              src={article.coverImage}
              alt={article.title}
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <article className="max-w-3xl mx-auto">
            {/* Excerpt */}
            <p className="text-lg text-muted-foreground mb-8 pb-8 border-b">
              {article.excerpt}
            </p>
            
            {/* Main Content */}
            <div 
              className="prose prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 border-t">
        <div className="container">
          <div className="max-w-3xl mx-auto flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/news">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回新闻列表
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
