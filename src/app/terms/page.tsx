"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/i18n/locale-context";
import { Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/content/safe-markdown";
import { siteInfo } from "@/config/site-config";

interface PageData {
  title: string;
  titleEn: string | null;
  titleFr: string | null;
  content: string;
  contentEn: string | null;
  contentFr: string | null;
  publishedAt: string | null;
}

export default function TermsPage() {
  const { locale } = useLocale();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch("/api/pages/terms");
        if (res.ok) {
          const data = await res.json();
          setPage(data);
        }
      } catch (e) {
        console.error("Error fetching terms page:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  // 根据语言获取标题和内容
  const getTitle = () => {
    const defaultTitle = locale === "en" ? "Terms of Service" : locale === "fr" ? "Conditions d'Utilisation" : "服务条款";
    if (!page) return defaultTitle;
    if (locale === "en" && page.titleEn) return page.titleEn;
    if (locale === "fr" && page.titleFr) return page.titleFr;
    return page.title;
  };

  const getContent = () => {
    if (!page) return getDefaultContent();
    if (locale === "en" && page.contentEn) return page.contentEn;
    if (locale === "fr" && page.contentFr) return page.contentFr;
    return page.content;
  };

  const getDefaultContent = () => {
    if (locale === "en") {
      return `# Terms of Service — Draft

> This fallback for ${siteInfo.legalName} is provided for configuration review only. It has not been approved for publication and requires professional legal review.

No final terms of service are currently published. The responsible reviewer must confirm the contracting entity, applicable services and jurisdictions, customer obligations, pricing and payment terms, liability, dispute process, termination, and an approved contact channel before release.`;
    }
    if (locale === "fr") {
      return `# Conditions d’utilisation — Brouillon

> Ce contenu de secours pour ${siteInfo.legalName} sert uniquement à la vérification de la configuration. Il n’est pas approuvé pour publication et doit faire l’objet d’un examen juridique professionnel.

Aucune condition d’utilisation définitive n’est actuellement publiée. Avant toute mise en ligne, le responsable doit confirmer l’entité contractante, les services et juridictions applicables, les obligations du client, les tarifs et paiements, la responsabilité, les litiges, la résiliation et un moyen de contact approuvé.`;
    }
    return `# 服务条款（草案）

> 本内容是 ${siteInfo.legalName} 的配置审阅 fallback，尚未获准发布，必须经过法律专业审核。

当前没有已定稿的服务条款。正式发布前，负责人必须确认签约主体、适用服务和司法辖区、客户义务、价格与付款条款、责任边界、争议处理、终止规则和经批准的联系渠道。`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{getTitle()}</h1>
            {page?.publishedAt && (
              <p className="text-sm text-muted-foreground">
                {locale === "zh" ? "最后更新: " : locale === "fr" ? "Dernière mise à jour: " : "Last updated: "}
                {new Date(page.publishedAt).toLocaleDateString(
                  locale === "zh" ? "zh-CN" : locale === "fr" ? "fr-FR" : "en-US"
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="container">
          <MarkdownRenderer content={getContent()} className="mx-auto max-w-3xl" />
        </div>
      </section>
    </>
  );
}
