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

export default function PrivacyPage() {
  const { locale } = useLocale();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch("/api/pages/privacy");
        if (res.ok) {
          const data = await res.json();
          setPage(data);
        }
      } catch (e) {
        console.error("Error fetching privacy page:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  // 根据语言获取标题和内容
  const getTitle = () => {
    const defaultTitle = locale === "en" ? "Privacy Policy" : locale === "fr" ? "Politique de Confidentialité" : "隐私政策";
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
      return `# Privacy Policy — Draft

> This fallback for ${siteInfo.legalName} is provided for configuration review only. It has not been approved for publication and requires professional privacy and legal review.

No final privacy policy is currently published. The responsible reviewer must confirm the applicable jurisdictions, collected data, processing purposes, retention, disclosure, user rights, safeguards, and an approved contact channel before release.`;
    }
    if (locale === "fr") {
      return `# Politique de confidentialité — Brouillon

> Ce contenu de secours pour ${siteInfo.legalName} sert uniquement à la vérification de la configuration. Il n’est pas approuvé pour publication et doit faire l’objet d’un examen professionnel en matière de confidentialité et de droit.

Aucune politique de confidentialité définitive n’est actuellement publiée. Avant toute mise en ligne, le responsable doit confirmer les juridictions applicables, les données collectées, les finalités, la conservation, les divulgations, les droits, les mesures de protection et un moyen de contact approuvé.`;
    }
    return `# 隐私政策（草案）

> 本内容是 ${siteInfo.legalName} 的配置审阅 fallback，尚未获准发布，必须经过隐私与法律专业审核。

当前没有已定稿的隐私政策。正式发布前，负责人必须确认适用司法辖区、收集的数据、处理目的、保存期限、对外披露、用户权利、安全措施和经批准的联系渠道。`;
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
