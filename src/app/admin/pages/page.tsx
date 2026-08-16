"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, FileText, Eye, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { MarkdownPreview } from "@/components/content/safe-markdown";
import { pageCreateSchema, pageUpdateSchema } from "@/lib/content/validation";

interface Page {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  titleFr: string | null;
  content: string;
  contentEn: string | null;
  contentFr: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PagesManagementPage() {
  const { t } = useLocale();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [previewPage, setPreviewPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    titleEn: "",
    titleFr: "",
    content: "",
    contentEn: "",
    contentFr: "",
    status: "DRAFT" as "DRAFT" | "PUBLISHED",
  });
  const [saving, setSaving] = useState(false);

  // 获取页面列表
  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/admin/pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (error) {
      console.error("Error fetching pages:", error);
      alert("获取页面列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (page?: Page) => {
    if (page) {
      setEditingPage(page);
      setFormData({
        slug: page.slug,
        title: page.title,
        titleEn: page.titleEn || "",
        titleFr: page.titleFr || "",
        content: page.content,
        contentEn: page.contentEn || "",
        contentFr: page.contentFr || "",
        status: page.status,
      });
    } else {
      setEditingPage(null);
      setFormData({
        slug: "",
        title: "",
        titleEn: "",
        titleFr: "",
        content: "",
        contentEn: "",
        contentFr: "",
        status: "DRAFT",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const validation = editingPage
      ? pageUpdateSchema.safeParse(formData)
      : pageCreateSchema.safeParse(formData);
    if (!validation.success) {
      alert(validation.error.issues[0]?.message || "页面内容校验失败");
      return;
    }
    if (
      formData.status === "PUBLISHED" &&
      editingPage?.status !== "PUBLISHED" &&
      !window.confirm("确认发布此页面？保存后内容会立即通过公开路径访问。")
    ) {
      return;
    }

    setSaving(true);
    try {
      const url = editingPage
        ? `/api/admin/pages/${editingPage.id}`
        : "/api/admin/pages";
      const method = editingPage ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });

      if (res.ok) {
        alert(editingPage ? "页面更新成功" : "页面创建成功");
        setIsDialogOpen(false);
        fetchPages();
      } else {
        const error = await res.json();
        alert(error.error || "保存失败");
      }
    } catch (error) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此页面吗？此操作不可恢复。")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("页面删除成功");
        fetchPages();
      } else {
        alert("删除失败");
      }
    } catch (error) {
      alert("删除失败");
    }
  };

  const handlePreview = (page: Page) => {
    setPreviewPage(page);
    setIsPreviewOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin text-primary" />
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b-2 border-dock-navy pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.admin?.pages?.title || "页面管理"}</h1>
          <p className="text-muted-foreground">
            {t.admin?.pages?.description || "管理隐私政策、服务条款等静态页面"}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          {t.admin?.pages?.addNew || "新建页面"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin?.pages?.list || "页面列表"}</CardTitle>
          <CardDescription>
            {t.admin?.pages?.listDesc || "管理网站的静态页面内容"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="border border-dashed border-input bg-concrete/35 px-5 py-10 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.admin?.pages?.noPages || "暂无页面，点击上方按钮创建"}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>{t.admin?.pages?.addNew || "新建页面"}</Button>
            </div>
          ) : (
            <Table containerLabel={t.admin?.pages?.list || "页面列表"} className="min-w-[42rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin?.pages?.slug || "标识"}</TableHead>
                  <TableHead>{t.admin?.pages?.pageTitle || "标题"}</TableHead>
                  <TableHead>{t.admin?.pages?.status || "状态"}</TableHead>
                  <TableHead>{t.admin?.pages?.updatedAt || "更新时间"}</TableHead>
                  <TableHead className="text-right">{t.admin?.pages?.actions || "操作"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-mono text-sm">{page.slug}</TableCell>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell>
                      <Badge variant={page.status === "PUBLISHED" ? "default" : "secondary"}>
                        {page.status === "PUBLISHED" ? "已发布" : "草稿"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(page.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`预览页面：${page.title}`}
                          onClick={() => handlePreview(page)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`编辑页面：${page.title}`}
                          onClick={() => handleOpenDialog(page)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`删除页面：${page.title}`}
                          onClick={() => handleDelete(page.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 编辑/创建对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90svh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage ? "编辑页面" : "创建新页面"}
            </DialogTitle>
            <DialogDescription>
              {editingPage ? "修改页面内容" : "创建一个新的静态页面"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="zh" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zh">中文</TabsTrigger>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="fr">Français</TabsTrigger>
            </TabsList>

            <div className="grid gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>页面标识 (slug) *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="privacy, terms, faq..."
                    disabled={!!editingPage}
                  />
                  <p className="text-xs text-muted-foreground">
                    访问路径: /{formData.slug || "slug"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as "DRAFT" | "PUBLISHED" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">草稿</SelectItem>
                      <SelectItem value="PUBLISHED">已发布</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="zh" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>标题 (中文) *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="隐私政策"
                  />
                </div>
                <div className="space-y-2">
                  <Label>内容 (中文) *</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="支持 Markdown；原始 HTML 不会被接受..."
                    rows={12}
                  />
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Title (English)</Label>
                  <Input
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    placeholder="Privacy Policy"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content (English)</Label>
                  <Textarea
                    value={formData.contentEn}
                    onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                    placeholder="Markdown only; raw HTML is not accepted..."
                    rows={12}
                  />
                </div>
              </TabsContent>

              <TabsContent value="fr" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Titre (Français)</Label>
                  <Input
                    value={formData.titleFr}
                    onChange={(e) => setFormData({ ...formData, titleFr: e.target.value })}
                    placeholder="Politique de confidentialité"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenu (Français)</Label>
                  <Textarea
                    value={formData.contentFr}
                    onChange={(e) => setFormData({ ...formData, contentFr: e.target.value })}
                    placeholder="Markdown uniquement; le HTML brut est refusé..."
                    rows={12}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[90svh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewPage?.title}</DialogTitle>
            <DialogDescription>
              页面预览 - /{previewPage?.slug}
            </DialogDescription>
          </DialogHeader>
          <MarkdownPreview content={previewPage?.content || ""} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
