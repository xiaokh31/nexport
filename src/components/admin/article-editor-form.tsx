"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MarkdownPreview } from "@/components/content/safe-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/i18n/locale-context";
import { normalizeArticleSlug } from "@/lib/articles/workflow";
import { articleInputSchema } from "@/lib/content/validation";

export type ArticleEditorValues = z.infer<typeof articleInputSchema>;

export const emptyArticleEditorValues: ArticleEditorValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  coverImageAlt: "",
  seoTitle: "",
  seoDescription: "",
  category: "company",
  tags: [],
  status: "DRAFT",
};

interface ArticleEditorFormProps {
  mode: "create" | "edit";
  articleId?: string;
  initialValues?: ArticleEditorValues;
  publishedAt?: string | null;
}

interface ArticleApiError {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

function parseTags(value: string) {
  return Array.from(new Set(
    value
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
  ));
}

export function ArticleEditorForm({
  mode,
  articleId,
  initialValues = emptyArticleEditorValues,
  publishedAt = null,
}: ArticleEditorFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [tagsInput, setTagsInput] = useState(initialValues.tags.join(", "));
  const slugLocked = mode === "edit" && Boolean(publishedAt);

  const form = useForm<ArticleEditorValues>({
    resolver: zodResolver(articleInputSchema),
    defaultValues: initialValues,
  });
  const previewValues = form.watch();

  const categories = [
    { value: "company", label: t.news?.categories?.company || "公司新闻" },
    { value: "industry", label: t.news?.categories?.industry || "行业资讯" },
    { value: "service", label: t.news?.categories?.service || "服务公告" },
    { value: "policy", label: t.news?.categories?.policy || "政策解读" },
  ];

  async function submit(values: ArticleEditorValues) {
    setServerError(null);
    const validation = articleInputSchema.safeParse({
      ...values,
      tags: parseTags(tagsInput),
    });
    if (!validation.success) {
      const issue = validation.error.issues[0];
      if (issue?.path[0] && issue.path[0] in initialValues) {
        form.setError(issue.path[0] as keyof ArticleEditorValues, {
          message: issue.message,
        });
      } else {
        setServerError(issue?.message || t.admin.articleValidationError);
      }
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/articles", {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "create"
            ? validation.data
            : { id: articleId, ...validation.data },
        ),
      });
      const result = await response.json().catch(() => null) as ArticleApiError | null;

      if (!response.ok) {
        for (const [field, messages] of Object.entries(result?.fieldErrors || {})) {
          if (field in initialValues && messages?.[0]) {
            form.setError(field as keyof ArticleEditorValues, { message: messages[0] });
          }
        }
        setServerError(result?.error || t.admin.articleSaveError);
        return;
      }

      router.push("/admin/articles");
      router.refresh();
    } catch {
      setServerError(t.admin.articleNetworkError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>{t.admin.articleContent}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.articleTitle}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t.admin.titlePlaceholder}
                            {...field}
                            onBlur={() => {
                              field.onBlur();
                              if (!slugLocked && !form.getValues("slug")) {
                                form.setValue("slug", normalizeArticleSlug(field.value), {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.slug}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t.admin.slugPlaceholder}
                            readOnly={slugLocked}
                            aria-readonly={slugLocked}
                            {...field}
                          />
                        </FormControl>
                        {slugLocked && <FormDescription>{t.admin.slugLockedHint}</FormDescription>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.excerpt}</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder={t.admin.excerptPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.content}</FormLabel>
                        <FormControl>
                          <Textarea rows={18} placeholder={t.admin.contentPlaceholder} {...field} />
                        </FormControl>
                        <FormDescription>{t.admin.markdownHint}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.admin.mediaSettings}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="coverImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.coverImage}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.admin.coverImagePlaceholder} {...field} />
                        </FormControl>
                        <FormDescription>{t.admin.coverImageHint}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="coverImageAlt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.coverImageAlt}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.admin.coverImageAltPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.admin.seoSettings}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.seoTitle}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.admin.seoTitlePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.seoDescription}</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder={t.admin.seoDescriptionPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t.admin.publishSettings}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.category}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t.admin.categoryPlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2">
                    <Label htmlFor="article-tags">{t.admin.tags}</Label>
                    <Input
                      id="article-tags"
                      value={tagsInput}
                      onChange={(event) => setTagsInput(event.target.value)}
                      placeholder={t.admin.tagsPlaceholder}
                      aria-describedby="article-tags-hint"
                      aria-invalid={Boolean(form.formState.errors.tags)}
                    />
                    <p id="article-tags-hint" className="text-sm text-muted-foreground">
                      {t.admin.tagsHint}
                    </p>
                    {form.formState.errors.tags?.message && (
                      <p className="text-sm text-destructive">{form.formState.errors.tags.message}</p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.status}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">{t.admin.draft}</SelectItem>
                            <SelectItem value="PUBLISHED">{t.admin.published}</SelectItem>
                            {mode === "edit" && (
                              <SelectItem value="ARCHIVED">{t.admin.archived}</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-2 pt-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {saving ? t.admin.savingArticle : t.admin.saveArticle}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      {t.admin.previewCurrentInput}
                    </Button>
                    {mode === "edit" && articleId && (
                      <Button variant="outline" asChild>
                        <Link href={`/admin/articles/${articleId}/preview`} target="_blank">
                          <Eye className="mr-2 h-4 w-4" />
                          {t.admin.previewSavedArticle}
                        </Link>
                      </Button>
                    )}
                    <Button type="button" variant="ghost" asChild>
                      <Link href="/admin/articles">{t.admin.cancelArticleEdit}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewValues.title || t.admin.untitledArticle}</DialogTitle>
            <DialogDescription>{t.admin.previewDescription}</DialogDescription>
          </DialogHeader>
          {previewValues.excerpt && (
            <p className="border-b pb-4 text-muted-foreground">{previewValues.excerpt}</p>
          )}
          <MarkdownPreview content={previewValues.content || ""} />
        </DialogContent>
      </Dialog>
    </>
  );
}
