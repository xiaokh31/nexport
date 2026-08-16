"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading, WorkspacePageHeader, WorkspacePanel } from "@/components/workspace/workspace-ui";
import { getServiceTypeLabel } from "@/config/site-config";
import { useLocale } from "@/i18n/locale-context";

interface Quote {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  company?: string | null;
  serviceType: string;
  origin?: string | null;
  destination?: string | null;
  cargoType?: string | null;
  pieceCount?: number | null;
  cartonCount?: number | null;
  palletCount?: number | null;
  weightValue?: string | null;
  weightUnit?: string | null;
  length?: string | null;
  width?: string | null;
  height?: string | null;
  dimensionUnit?: string | null;
  requestedDate?: string | null;
  message: string;
  status: string;
  amount?: string | null;
  currency?: string | null;
  customerNote?: string | null;
  quotedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const copy = {
  zh: {
    eyebrow: "客户工作台",
    description: "查看当前账户提交的真实询价、处理状态与已发布报价。",
    count: (total: number) => `共 ${total} 条询价记录`,
    empty: "还没有询价记录",
    emptyHint: "提交第一条物流需求后，询价编号和处理进度会显示在这里。",
    newQuote: "提交询价",
    failed: "无法读取询价记录",
    failedHint: "询价列表暂时无法加载，请重新尝试。",
    retry: "重新加载",
    detail: "询价详情",
    close: "关闭",
    quoteInfo: "报价信息",
    pendingQuote: "待报价",
    message: "需求说明",
  },
  en: {
    eyebrow: "Customer workspace",
    description: "Review real quotes submitted by this account, their status, and published pricing.",
    count: (total: number) => `${total} quote records`,
    empty: "No quote records yet",
    emptyHint: "Submit your first logistics request to see its reference and progress here.",
    newQuote: "Submit a quote",
    failed: "Quote records could not be loaded",
    failedHint: "The quote list is temporarily unavailable. Please try again.",
    retry: "Reload",
    detail: "Quote details",
    close: "Close",
    quoteInfo: "Published quote",
    pendingQuote: "Pending quote",
    message: "Request details",
  },
  fr: {
    eyebrow: "Espace client",
    description: "Consultez les demandes réelles du compte, leur statut et les tarifs publiés.",
    count: (total: number) => `${total} demandes de devis`,
    empty: "Aucune demande de devis",
    emptyHint: "Envoyez votre première demande logistique pour voir sa référence et son suivi ici.",
    newQuote: "Demander un devis",
    failed: "Impossible de charger les devis",
    failedHint: "La liste est momentanément indisponible. Réessayez.",
    retry: "Recharger",
    detail: "Détails du devis",
    close: "Fermer",
    quoteInfo: "Devis publié",
    pendingQuote: "En attente de devis",
    message: "Détails de la demande",
  },
} as const;

export default function QuotesPage() {
  const { locale, t } = useLocale();
  const content = copy[locale];
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PENDING: { label: t.admin.pending, variant: "secondary" },
    PROCESSING: { label: t.admin.processing, variant: "default" },
    QUOTED: { label: t.admin.quoted, variant: "default" },
    ACCEPTED: { label: t.admin.accepted, variant: "default" },
    REJECTED: { label: t.admin.rejected, variant: "destructive" },
    CLOSED: { label: t.admin.closed, variant: "outline" },
  };

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/user/quotes?page=${page}&limit=20`, { cache: "no-store" });
      if (!response.ok) throw new Error("quote list failed");
      const data = await response.json();
      setQuotes(data.quotes || []);
      setTotal(data.total || 0);
      setPages(Math.max(data.pages || 1, 1));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void loadQuotes(); }, [loadQuotes]);

  if (loading) return <WorkspaceLoading label={t.common.loading} />;

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow={content.eyebrow}
        title={t.user.myQuotes}
        description={content.description}
        actions={<Button asChild><Link href="/contact"><Plus aria-hidden="true" className="mr-2 h-4 w-4" />{content.newQuote}</Link></Button>}
      />
      {error ? (
        <WorkspaceError title={content.failed} description={content.failedHint} action={<Button variant="outline" onClick={() => void loadQuotes()}>{content.retry}</Button>} />
      ) : (
        <WorkspacePanel title={t.admin.quoteList} description={content.count(total)} icon={FileText}>
          {quotes.length ? (
            <>
              <Table containerLabel={t.admin.quoteList} className="min-w-[48rem]">
                <TableHeader><TableRow>
                  <TableHead>{t.admin.quoteId}</TableHead>
                  <TableHead>{t.admin.serviceType}</TableHead>
                  <TableHead>{t.form.origin}</TableHead>
                  <TableHead>{t.form.destination}</TableHead>
                  <TableHead>{t.admin.status}</TableHead>
                  <TableHead>{t.admin.submitTime}</TableHead>
                  <TableHead className="text-right">{t.admin.actions}</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {quotes.map((quote) => {
                    const status = statusMap[quote.status] || statusMap.PENDING;
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-utility text-xs font-semibold">{quote.reference}</TableCell>
                        <TableCell>{getServiceTypeLabel(quote.serviceType, t)}</TableCell>
                        <TableCell>{quote.origin || "—"}</TableCell>
                        <TableCell>{quote.destination || "—"}</TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell><time dateTime={quote.createdAt}>{new Date(quote.createdAt).toLocaleDateString()}</time></TableCell>
                        <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedQuote(quote)}><Eye aria-hidden="true" className="mr-1 h-4 w-4" />{t.user.view}</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {pages > 1 ? (
                <nav aria-label={t.user.myQuotes} className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
                  <span className="text-sm text-muted-foreground">{page} / {pages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>{t.common.previous}</Button>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>{t.common.next}</Button>
                  </div>
                </nav>
              ) : null}
            </>
          ) : (
            <WorkspaceEmpty title={content.empty} description={content.emptyHint} icon={FileText} action={<Button asChild><Link href="/contact">{content.newQuote}</Link></Button>} />
          )}
        </WorkspacePanel>
      )}

      <Dialog open={Boolean(selectedQuote)} onOpenChange={(open) => { if (!open) setSelectedQuote(null); }}>
        <DialogContent className="max-h-[88svh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{content.detail}</DialogTitle>
            <DialogDescription className="font-utility">{selectedQuote?.reference}</DialogDescription>
          </DialogHeader>
          {selectedQuote ? (
            <div className="space-y-5">
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  [t.user.name, selectedQuote.name],
                  [t.user.company, selectedQuote.company || "—"],
                  [t.user.emailLabel, selectedQuote.email],
                  [t.user.phone, selectedQuote.phone],
                  [t.admin.serviceType, getServiceTypeLabel(selectedQuote.serviceType, t)],
                  [t.form.origin, selectedQuote.origin || "—"],
                  [t.form.destination, selectedQuote.destination || "—"],
                  [t.form.cargoType, selectedQuote.cargoType || "—"],
                ].map(([label, value]) => (
                  <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{value}</dd></div>
                ))}
                <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.admin.status}</dt><dd className="mt-1"><Badge variant={(statusMap[selectedQuote.status] || statusMap.PENDING).variant}>{(statusMap[selectedQuote.status] || statusMap.PENDING).label}</Badge></dd></div>
                {selectedQuote.weightValue && selectedQuote.weightUnit ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.form.weightValue}</dt><dd className="mt-1 text-sm font-medium">{selectedQuote.weightValue} {selectedQuote.weightUnit}</dd></div> : null}
                {selectedQuote.length && selectedQuote.width && selectedQuote.height && selectedQuote.dimensionUnit ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.form.length} × {t.form.width} × {t.form.height}</dt><dd className="mt-1 text-sm font-medium">{selectedQuote.length} × {selectedQuote.width} × {selectedQuote.height} {selectedQuote.dimensionUnit}</dd></div> : null}
                {selectedQuote.pieceCount != null || selectedQuote.cartonCount != null || selectedQuote.palletCount != null ? <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.form.pieceCount} / {t.form.cartonCount} / {t.form.palletCount}</dt><dd className="mt-1 text-sm font-medium">{selectedQuote.pieceCount ?? "—"} / {selectedQuote.cartonCount ?? "—"} / {selectedQuote.palletCount ?? "—"}</dd></div> : null}
                {selectedQuote.requestedDate ? <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.form.requestedDate}</dt><dd className="mt-1 text-sm font-medium">{new Date(selectedQuote.requestedDate).toLocaleDateString()}</dd></div> : null}
              </dl>
              <div><Label className="text-muted-foreground">{content.message}</Label><p className="mt-1 whitespace-pre-wrap break-words text-sm">{selectedQuote.message}</p></div>
              {selectedQuote.amount || selectedQuote.status === "QUOTED" ? (
                <section className="border-l-4 border-success bg-success/5 p-4">
                  <h3 className="font-semibold text-success">{content.quoteInfo}</h3>
                  <p className="font-display mt-2 text-2xl font-bold">{selectedQuote.amount && selectedQuote.currency ? `${selectedQuote.amount} ${selectedQuote.currency}` : content.pendingQuote}</p>
                  {selectedQuote.customerNote ? <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{selectedQuote.customerNote}</p> : null}
                </section>
              ) : null}
              <div className="grid gap-2 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
                <time dateTime={selectedQuote.createdAt}>{new Date(selectedQuote.createdAt).toLocaleString()}</time>
                <time dateTime={selectedQuote.updatedAt}>{new Date(selectedQuote.updatedAt).toLocaleString()}</time>
              </div>
            </div>
          ) : null}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedQuote(null)}>{content.close}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
