"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ArticleEditorForm,
  emptyArticleEditorValues,
} from "@/components/admin/article-editor-form";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-context";

export default function NewArticlePage() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b-2 border-dock-navy pb-5">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/articles" aria-label={t.admin.cancelArticleEdit}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.newArticle}</h1>
          <p className="text-muted-foreground">{t.admin.newArticleDescription}</p>
        </div>
      </div>
      <ArticleEditorForm mode="create" initialValues={emptyArticleEditorValues} />
    </div>
  );
}
