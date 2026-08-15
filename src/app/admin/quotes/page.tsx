"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Eye, CheckCircle, XCircle, Loader2, Send, Trash2 } from "lucide-react";
import { useLocale } from "@/i18n/locale-context";
import { getServiceTypeLabel } from "@/config/site-config";
import { QUOTE_STATUSES, type QuoteStatus } from "@/config/quote";
import {
  asQuoteActorRole,
  canEditQuoteInternalNote,
  canEditQuotePricing,
  canTransitionQuote,
} from "@/lib/quote/workflow";

interface Quote {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  serviceType: string;
  origin?: string;
  destination?: string;
  cargoType?: string;
  pieceCount?: number;
  cartonCount?: number;
  palletCount?: number;
  weightValue?: string;
  weightUnit?: string;
  length?: string;
  width?: string;
  height?: string;
  dimensionUnit?: string;
  requestedDate?: string;
  message: string;
  status: string;
  amount?: string;
  currency?: string;
  customerNote?: string;
  internalNote?: string;
  quotedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function QuotesManagePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const { t } = useLocale();
  const { data: session } = useSession();
  const actorRole = asQuoteActorRole(session?.user?.role);

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: t.admin?.pending || "待处理", variant: "secondary" },
    PROCESSING: { label: t.admin?.processing || "处理中", variant: "default" },
    QUOTED: { label: t.admin?.quoted || "已报价", variant: "default" },
    ACCEPTED: { label: t.admin?.accepted || "已接受", variant: "default" },
    REJECTED: { label: t.admin?.rejected || "已拒绝", variant: "destructive" },
    CLOSED: { label: t.admin?.closed || "已关闭", variant: "outline" },
  };

  // 获取询价列表
  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          status: statusFilter,
          search: searchTerm,
        });
        
        const response = await fetch(`/api/admin/quotes?${params}`);
        if (response.ok) {
          const data = await response.json();
          setQuotes(data.quotes);
          setTotal(data.total);
        } else {
          const errorData = await response.json();
          setError(errorData.error?.message || (typeof errorData.error === "string" ? errorData.error : "获取询价列表失败"));
        }
      } catch (err) {
        setError("获取询价列表失败");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [page, statusFilter, searchTerm]);

  // 更新询价状态
  const updateQuoteStatus = async (id: string, status: string) => {
    const currentQuote = quotes.find((quote) => quote.id === id);
    if (!currentQuote) return;

    const reasonRequired =
      (status === "CLOSED" && ["PENDING", "PROCESSING", "QUOTED"].includes(currentQuote.status)) ||
      (currentQuote.status === "PROCESSING" && status === "PENDING") ||
      (currentQuote.status === "QUOTED" && status === "PROCESSING") ||
      (["ACCEPTED", "REJECTED"].includes(currentQuote.status) && status === "QUOTED");
    const reason = reasonRequired ? window.prompt("请输入状态变更原因（10至500字符）") : undefined;
    if (reasonRequired && (!reason || reason.trim().length < 10)) {
      alert("状态变更原因至少需要10个字符");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, reason, requestKey: crypto.randomUUID() }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(quotes.map(quote => quote.id === id ? data.quote : quote));
        if (selectedQuote?.id === id) {
          setSelectedQuote(data.quote);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error?.message || (typeof errorData.error === "string" ? errorData.error : "更新状态失败"));
      }
    } catch (err) {
      alert("更新状态失败");
    } finally {
      setUpdating(false);
    }
  };

  // 查看详情
  const viewDetail = (quote: Quote) => {
    setSelectedQuote(quote);
    setInternalNote(quote.internalNote || "");
    setShowDetailDialog(true);
  };

  // 打开报价对话框
  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setQuoteAmount(quote.amount || "");
    setQuoteCurrency(quote.currency || "");
    setCustomerNote(quote.customerNote || "");
    setShowQuoteDialog(true);
  };

  // 提交报价
  const submitQuote = async () => {
    if (!selectedQuote || !quoteAmount || !/^[A-Z]{3}$/.test(quoteCurrency)) {
      alert("请输入有效的报价金额和三字母币种");
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedQuote.id,
          status: "QUOTED",
          amount: quoteAmount,
          currency: quoteCurrency,
          customerNote,
          requestKey: crypto.randomUUID(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(quotes.map(quote =>
          quote.id === selectedQuote.id ? data.quote : quote
        ));
        setShowQuoteDialog(false);
        alert("Quote submitted!");
      } else {
        const errorData = await response.json();
        alert(errorData.error?.message || (typeof errorData.error === "string" ? errorData.error : "提交报价失败"));
      }
    } catch (err) {
      alert("提交报价失败");
    } finally {
      setUpdating(false);
    }
  };

  const saveInternalNote = async () => {
    if (!selectedQuote || !actorRole) return;
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedQuote.id,
          internalNote,
          requestKey: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error?.message || "保存内部备注失败");
        return;
      }
      setSelectedQuote(data.quote);
      setQuotes((current) => current.map((quote) =>
        quote.id === data.quote.id ? data.quote : quote
      ));
    } catch {
      alert("保存内部备注失败");
    } finally {
      setUpdating(false);
    }
  };

  const deleteQuote = async (quote: Quote) => {
    const reason = window.prompt("请输入删除原因（10至500字符）");
    if (!reason || reason.trim().length < 10) {
      alert("删除原因至少需要10个字符");
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error?.message || "删除询价失败");
        return;
      }
      setQuotes((current) => current.filter((item) => item.id !== quote.id));
      setTotal((current) => Math.max(0, current - 1));
      setShowDetailDialog(false);
      setSelectedQuote(null);
    } catch {
      alert("删除询价失败");
    } finally {
      setUpdating(false);
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
      <div>
        <h1 className="text-2xl font-bold">询价管理</h1>
        <p className="text-muted-foreground">管理客户的询价请求</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>询价列表</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索客户名称或邮箱..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="PENDING">待处理</SelectItem>
                  <SelectItem value="PROCESSING">处理中</SelectItem>
                  <SelectItem value="QUOTED">已报价</SelectItem>
                  <SelectItem value="ACCEPTED">已接受</SelectItem>
                  <SelectItem value="REJECTED">已拒绝</SelectItem>
                  <SelectItem value="CLOSED">已关闭</SelectItem>
                </SelectContent>
              </Select>
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
                    <TableHead>编号</TableHead>
                    <TableHead>客户</TableHead>
                    <TableHead>联系方式</TableHead>
                    <TableHead>服务类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.length > 0 ? (
                    quotes.map((quote) => {
                      const status = statusMap[quote.status];
                      return (
                        <TableRow key={quote.id}>
                          <TableCell className="font-mono text-xs">{quote.reference}</TableCell>
                          <TableCell>{quote.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{quote.email}</div>
                              <div className="text-muted-foreground">{quote.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getServiceTypeLabel(quote.serviceType, t)}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>{new Date(quote.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => viewDetail(quote)}
                                title="查看详情"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {actorRole && canTransitionQuote(
                                actorRole,
                                quote.status as QuoteStatus,
                                "PROCESSING",
                              ) && (
                                <Button
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-blue-500"
                                  onClick={() => updateQuoteStatus(quote.id, "PROCESSING")}
                                  title="开始处理"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {actorRole && canTransitionQuote(
                                actorRole,
                                quote.status as QuoteStatus,
                                "QUOTED",
                              ) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-500"
                                  onClick={() => canEditQuotePricing(actorRole, "PROCESSING")
                                    ? openQuoteDialog(quote)
                                    : updateQuoteStatus(quote.id, "QUOTED")}
                                  title="提交报价"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              {actorRole && quote.status === "QUOTED" && (
                                <>
                                  {canTransitionQuote(actorRole, "QUOTED", "ACCEPTED") && (
                                    <Button variant="ghost" size="icon" className="text-green-500" onClick={() => updateQuoteStatus(quote.id, "ACCEPTED")} title="接受">
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canTransitionQuote(actorRole, "QUOTED", "REJECTED") && (
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => updateQuoteStatus(quote.id, "REJECTED")} title="拒绝">
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无询价记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              
              {/* 分页 */}
              {total > 0 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    显示第 {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} 条，共 {total} 条
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(total / 10)}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>询价详情</DialogTitle>
            <DialogDescription>
              {selectedQuote?.reference}
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
                  <p className="font-medium">{getServiceTypeLabel(selectedQuote.serviceType, t)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">状态</Label>
                  <Badge variant={statusMap[selectedQuote.status].variant}>
                    {statusMap[selectedQuote.status].label}
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
                {selectedQuote.weightValue && selectedQuote.weightUnit && (
                  <div>
                    <Label className="text-muted-foreground">重量</Label>
                    <p className="font-medium">{selectedQuote.weightValue} {selectedQuote.weightUnit}</p>
                  </div>
                )}
                {selectedQuote.length && selectedQuote.width && selectedQuote.height && selectedQuote.dimensionUnit && (
                  <div>
                    <Label className="text-muted-foreground">尺寸</Label>
                    <p className="font-medium">
                      {selectedQuote.length} × {selectedQuote.width} × {selectedQuote.height} {selectedQuote.dimensionUnit}
                    </p>
                  </div>
                )}
                {(selectedQuote.pieceCount !== null || selectedQuote.cartonCount !== null || selectedQuote.palletCount !== null) && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">数量</Label>
                    <p className="font-medium">
                      件 {selectedQuote.pieceCount ?? "-"} / 箱 {selectedQuote.cartonCount ?? "-"} / 托 {selectedQuote.palletCount ?? "-"}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">留言内容</Label>
                <p className="font-medium whitespace-pre-wrap">{selectedQuote.message}</p>
              </div>
              
              {/* 报价信息 */}
              {(selectedQuote.amount || selectedQuote.status === "QUOTED") && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2">报价信息</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">报价金额</Label>
                      <p className="font-bold text-green-600 text-lg">
                        {selectedQuote.amount && selectedQuote.currency ? `${selectedQuote.amount} ${selectedQuote.currency}` : "-"}
                      </p>
                    </div>
                    {selectedQuote.quotedAt && (
                      <div>
                        <Label className="text-muted-foreground">报价时间</Label>
                        <p className="font-medium">{new Date(selectedQuote.quotedAt).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedQuote.customerNote && (
                    <div className="mt-2">
                      <Label className="text-muted-foreground">客户可见备注</Label>
                      <p className="font-medium whitespace-pre-wrap">{selectedQuote.customerNote}</p>
                    </div>
                  )}
                </div>
              )}
              {selectedQuote.internalNote && (
                !actorRole ||
                !canEditQuoteInternalNote(
                  actorRole,
                  selectedQuote.status as QuoteStatus,
                )
              ) && (
                <div>
                  <Label className="text-muted-foreground">内部备注</Label>
                  <p className="font-medium whitespace-pre-wrap">{selectedQuote.internalNote}</p>
                </div>
              )}
              {actorRole && canEditQuoteInternalNote(
                actorRole,
                selectedQuote.status as QuoteStatus,
              ) && (
                <div className="space-y-2">
                  <Label htmlFor="internal-note">内部备注</Label>
                  <Textarea
                    id="internal-note"
                    maxLength={4_000}
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveInternalNote}
                    disabled={updating}
                  >
                    保存内部备注
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>提交时间: {new Date(selectedQuote.createdAt).toLocaleString()}</div>
                <div>更新时间: {new Date(selectedQuote.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedQuote && actorRole && canTransitionQuote(
              actorRole,
              selectedQuote.status as QuoteStatus,
              "QUOTED",
            ) && canEditQuotePricing(
              actorRole,
              selectedQuote.status as QuoteStatus,
            ) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDetailDialog(false);
                  setTimeout(() => openQuoteDialog(selectedQuote), 100);
                }}
              >
                提交报价
              </Button>
            )}
            {selectedQuote && actorRole && (
              <Select
                value={selectedQuote.status}
                onValueChange={(value) => updateQuoteStatus(selectedQuote.id, value)}
                disabled={updating}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={selectedQuote.status} disabled>
                    {statusMap[selectedQuote.status].label}
                  </SelectItem>
                  {QUOTE_STATUSES.filter((status) => canTransitionQuote(
                    actorRole,
                    selectedQuote.status as QuoteStatus,
                    status,
                  )).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusMap[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedQuote?.status === "PENDING" && actorRole === "ADMIN" && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteQuote(selectedQuote)}
                disabled={updating}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                删除
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 报价对话框 */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>提交报价</DialogTitle>
            <DialogDescription>
              为 {selectedQuote?.name} 的询价提供报价
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">报价金额 *</Label>
              <Input id="price" type="number" min="0.01" step="0.01" placeholder="例如：500.00" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">币种 *</Label>
              <Input id="currency" maxLength={3} placeholder="例如：USD" value={quoteCurrency} onChange={(e) => setQuoteCurrency(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">客户可见备注</Label>
              <Textarea
                id="note"
                placeholder="添加报价说明..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              取消
            </Button>
            <Button onClick={submitQuote} disabled={updating || !quoteAmount || !quoteCurrency}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  提交报价
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
