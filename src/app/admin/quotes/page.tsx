"use client";

import { useState, useEffect } from "react";
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
import { Search, Eye, CheckCircle, XCircle, Loader2, Send } from "lucide-react";
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
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const { t } = useLocale();

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: t.admin?.pending || "待处理", variant: "secondary" },
    PROCESSING: { label: t.admin?.processing || "处理中", variant: "default" },
    QUOTED: { label: t.admin?.quoted || "已报价", variant: "default" },
    ACCEPTED: { label: t.admin?.accepted || "已接受", variant: "default" },
    REJECTED: { label: t.admin?.rejected || "已拒绝", variant: "destructive" },
    CLOSED: { label: t.admin?.closed || "已关闭", variant: "outline" },
  };

  const serviceTypeMap: Record<string, string> = {
    FBA: t.form?.fbaService || "FBA尾程提拆派服务",
    DROPSHIPPING: t.form?.dropshippingService || "本地仓库一件代发",
    RETURNS: t.form?.returnsService || "退货换标",
    OTHER: t.form?.otherService || "其他",
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
          setError(errorData.error || "获取询价列表失败");
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
    setUpdating(true);
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        setQuotes(quotes.map(quote => 
          quote.id === id ? { ...quote, status } : quote
        ));
        if (selectedQuote?.id === id) {
          setSelectedQuote({ ...selectedQuote, status });
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "更新状态失败");
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
    setShowDetailDialog(true);
  };

  // 打开报价对话框
  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    // Pre-populate existing quote data for editing
    setQuotePrice(quote.quotedPrice || '');
    setQuoteNote(quote.quoteNote || '');
    setShowQuoteDialog(true);
  };

  // 提交报价
  const submitQuote = async () => {
    if (!selectedQuote || !quotePrice) {
      alert("请输入报价金额");
      return;
    }

    setUpdating(true);
    try {
      // If already quoted, just update. Otherwise set to QUOTED
      const isUpdating = selectedQuote.status === 'QUOTED';
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: selectedQuote.id, 
          status: isUpdating ? selectedQuote.status : "QUOTED",
          quotedPrice: quotePrice,
          quoteNote: quoteNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuotes(quotes.map(quote => 
          quote.id === selectedQuote.id ? data.quote : quote
        ));
        setShowQuoteDialog(false);
        alert(isUpdating ? 'Quote updated!' : 'Quote submitted!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || "提交报价失败");
      }
    } catch (err) {
      alert("提交报价失败");
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
                    <TableHead>ID</TableHead>
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
                          <TableCell className="font-medium">{quote.id.slice(0, 8)}...</TableCell>
                          <TableCell>{quote.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{quote.email}</div>
                              <div className="text-muted-foreground">{quote.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>{serviceTypeMap[quote.serviceType] || quote.serviceType}</TableCell>
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
                              {quote.status === "PENDING" && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-blue-500"
                                  onClick={() => openQuoteDialog(quote)}
                                  title="提交报价"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-500"
                                onClick={() => updateQuoteStatus(quote.id, 'ACCEPTED')}
                                title="接受"
                                disabled={quote.status === "ACCEPTED"}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500"
                                onClick={() => updateQuoteStatus(quote.id, 'REJECTED')}
                                title="拒绝"
                                disabled={quote.status === "REJECTED"}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
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
                      <p className="font-bold text-green-600 text-lg">{selectedQuote.quotedPrice || '-'}</p>
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
            {selectedQuote?.status === 'QUOTED' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDetailDialog(false);
                  setTimeout(() => openQuoteDialog(selectedQuote), 100);
                }}
              >
                Edit Quote
              </Button>
            )}
            <Select 
              value={selectedQuote?.status} 
              onValueChange={(value) => selectedQuote && updateQuoteStatus(selectedQuote.id, value)}
              disabled={updating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">待处理</SelectItem>
                <SelectItem value="PROCESSING">处理中</SelectItem>
                <SelectItem value="QUOTED">已报价</SelectItem>
                <SelectItem value="ACCEPTED">已接受</SelectItem>
                <SelectItem value="REJECTED">已拒绝</SelectItem>
                <SelectItem value="CLOSED">已关闭</SelectItem>
              </SelectContent>
            </Select>
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
              <Input
                id="price"
                placeholder="例如: $500 USD"
                value={quotePrice}
                onChange={(e) => setQuotePrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">备注说明</Label>
              <Textarea
                id="note"
                placeholder="添加报价说明..."
                value={quoteNote}
                onChange={(e) => setQuoteNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              取消
            </Button>
            <Button onClick={submitQuote} disabled={updating || !quotePrice}>
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
