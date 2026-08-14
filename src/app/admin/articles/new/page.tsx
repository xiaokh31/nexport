"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/i18n/locale-context";

const articleSchema = z.object({
  title: z.string().min(2, "标题至少2个字符"),
  slug: z.string().min(2, "URL别名至少2个字符"),
  excerpt: z.string().min(10, "摘要至少10个字符"),
  content: z.string().min(50, "内容至少50个字符"),
  category: z.string().min(1, "请选择分类"),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export default function NewArticlePage() {
  const { t } = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 分类选项
  const categories = [
    { value: "company", label: t.news?.categories?.company || "公司新闻" },
    { value: "industry", label: t.news?.categories?.industry || "行业资讯" },
    { value: "service", label: t.news?.categories?.service || "服务公告" },
    { value: "policy", label: t.news?.categories?.policy || "政策解读" },
  ];

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: "",
      status: "DRAFT",
    },
  });

  async function onSubmit(data: ArticleFormValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        router.push("/admin/articles");
        router.refresh(); // 刷新页面以显示新文章
      } else {
        const errorData = await response.json();
        console.error("创建文章失败:", errorData.error);
      }
    } catch (error) {
      console.error("网络错误:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/articles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t.admin.newArticle}</h1>
          <p className="text-muted-foreground">{t.admin.newArticleDescription}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
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
                          <Input placeholder={t.admin.titlePlaceholder} {...field} />
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
                          <Input placeholder={t.admin.slugPlaceholder} {...field} />
                        </FormControl>
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
                          <Textarea
                            placeholder={t.admin.excerptPlaceholder}
                            rows={3}
                            {...field}
                          />
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
                          <Textarea
                            placeholder={t.admin.contentPlaceholder}
                            rows={15}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t.admin.categoryPlaceholder} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.admin.status}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">{t.admin.draft}</SelectItem>
                            <SelectItem value="PUBLISHED">{t.admin.published}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t.admin.save}
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      {t.admin.preview}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
