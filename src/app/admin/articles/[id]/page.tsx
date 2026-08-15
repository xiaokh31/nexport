"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  ArticleEditorForm,
  type ArticleEditorValues,
} from "@/components/admin/article-editor-form";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-context";

interface ArticleResponse extends ArticleEditorValues {
  id: string;
  publishedAt: string | null;
}

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function loadArticle() {
      try {
        const response = await fetch(`/api/admin/articles/${id}`);
        const result = await response.json().catch(() => null) as ArticleResponse | { error?: string } | null;
        if (!active) return;

        if (!response.ok || !result || !("id" in result)) {
          setError(result && "error" in result ? result.error || t.admin.articleLoadError : t.admin.articleLoadError);
          return;
        }
        setArticle({
          ...result,
          coverImage: result.coverImage || "",
          coverImageAlt: result.coverImageAlt || "",
          seoTitle: result.seoTitle || "",
          seoDescription: result.seoDescription || "",
        });
      } catch {
        if (active) setError(t.admin.articleLoadError);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadArticle();
    return () => { active = false; };
  }, [id, t.admin.articleLoadError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{error || t.admin.articleLoadError}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/articles">{t.admin.backToArticleList}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/articles" aria-label={t.admin.backToArticleList}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.editArticle}</h1>
          <p className="text-muted-foreground">{t.admin.editArticleDescription}</p>
        </div>
      </div>
      <ArticleEditorForm
        mode="edit"
        articleId={article.id}
        initialValues={article}
        publishedAt={article.publishedAt}
      />
    </div>
  );
}
