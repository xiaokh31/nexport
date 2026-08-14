"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, FileText, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";

interface Quote {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  serviceType: string;
  origin?: string;
  destination?: string;
  cargoType?: string;
  weight?: string;
  dimensions?: string;
  message: string;
  status: string;
  quotedPrice?: string;
  quoteNote?: string;
  quotedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function QuotesPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 状态映射 - 使用翻译
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: t.admin.pending, variant: "secondary" },
    PROCESSING: { label: t.admin.processing, variant: "default" },
    QUOTED: { label: t.admin.quoted, variant: "default" },
    ACCEPTED: { label: t.admin.accepted, variant: "default" },
    REJECTED: { label: t.admin.rejected, variant: "destructive" },
    CLOSED: { label: t.admin.closed, variant: "outline" },
  };

  // 服务类型映射 - 使用翻译
  const serviceTypeMap: Record<string, string> = {
    FBA: t.form.fbaService,
    DROPSHIPPING: t.form.dropshippingService,
    RETURNS: t.form.returnsService,
    OTHER: t.form.otherService,
  };

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const response = await fetch("/api/user/quotes");
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes);
          setTotal(data.total);
        } else {
          const errData = await response.json();
          setError(errData.error);
        }
      } catch (err) {
        setError("获取询价记录失败");
      } finally {
        setIsLoading(false);
      }
    }

    if (session?.user) {
      fetchQuotes();
    }
  }, [session]);

  // 查看详情
  const viewDetail = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.user.myQuotes}</h1>
        <p className="text-muted-foreground">{t.admin.quoteManagement}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t.admin.quoteList}
          </CardTitle>
          <CardDescription>
            {t.common.loading === "Loading..." ? `Total ${total} quotes` : `共 ${total} 条询价记录`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12 text-red-500">
              {error}
            </div>
          ) : quotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.admin.quoteId}</TableHead>
                  <TableHead>{t.admin.serviceType}</TableHead>
                  <TableHead>{t.form.origin}</TableHead>
                  <TableHead>{t.form.destination}</TableHead>
                  <TableHead>{t.admin.status}</TableHead>
                  <TableHead>{t.admin.submitTime}</TableHead>
                  <TableHead className="text-right">{t.admin.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => {
                  const status = statusMap[quote.status] || statusMap.PENDING;
                  return (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.id.slice(0, 12)}...</TableCell>
                      <TableCell>{serviceTypeMap[quote.serviceType] || quote.serviceType}</TableCell>
                      <TableCell>{quote.origin || "-"}</TableCell>
                      <TableCell>{quote.destination || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>{new Date(quote.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => viewDetail(quote)}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t.user.view}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t.messages.noNotifications}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>询价详情</DialogTitle>
            <DialogDescription>
              ID: {selectedQuote?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">客户名称</Label>
                  <p className="font-medium">{selectedQuote.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">公司</Label>
                  <p className="font-medium">{selectedQuote.company || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">邮箱</Label>
                  <p className="font-medium">{selectedQuote.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">电话</Label>
                  <p className="font-medium">{selectedQuote.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">服务类型</Label>
                  <p className="font-medium">{serviceTypeMap[selectedQuote.serviceType]}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={statusMap[selectedQuote.status]?.variant || "secondary"}>
                    {statusMap[selectedQuote.status]?.label || selectedQuote.status}
                  </Badge>
                </div>
                {selectedQuote.origin && (
                  <div>
                    <Label className="text-muted-foreground">起运地</Label>
                    <p className="font-medium">{selectedQuote.origin}</p>
                  </div>
                )}
                {selectedQuote.destination && (
                  <div>
                    <Label className="text-muted-foreground">目的地</Label>
                    <p className="font-medium">{selectedQuote.destination}</p>
                  </div>
                )}
                {selectedQuote.cargoType && (
                  <div>
                    <Label className="text-muted-foreground">货物类型</Label>
                    <p className="font-medium">{selectedQuote.cargoType}</p>
                  </div>
                )}
                {selectedQuote.weight && (
                  <div>
                    <Label className="text-muted-foreground">重量</Label>
                    <p className="font-medium">{selectedQuote.weight}</p>
                  </div>
                )}
                {selectedQuote.dimensions && (
                  <div>
                    <Label className="text-muted-foreground">尺寸</Label>
                    <p className="font-medium">{selectedQuote.dimensions}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">留言内容</Label>
                <p className="font-medium whitespace-pre-wrap">{selectedQuote.message}</p>
              </div>
              
              {/* 报价信息 */}
              {(selectedQuote.quotedPrice || selectedQuote.status === 'QUOTED') && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2">报价信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">报价金额</Label>
                      <p className="font-bold text-green-600 text-lg">{selectedQuote.quotedPrice || '待报价'}</p>
                    </div>
                    {selectedQuote.quotedAt && (
                      <div>
                        <Label className="text-muted-foreground">报价时间</Label>
                        <p className="font-medium">{new Date(selectedQuote.quotedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedQuote.quoteNote && (
                    <div className="mt-2">
                      <Label className="text-muted-foreground">报价备注</Label>
                      <p className="font-medium whitespace-pre-wrap">{selectedQuote.quoteNote}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>提交时间: {new Date(selectedQuote.createdAt).toLocaleString()}</div>
                <div>更新时间: {new Date(selectedQuote.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
