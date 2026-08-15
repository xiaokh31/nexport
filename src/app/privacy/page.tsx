"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/i18n/locale-context";
import { Loader2 } from "lucide-react";
import { MarkdownRenderer } from "@/components/content/safe-markdown";

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
      return `# Privacy Policy

Welcome to Company Name. We respect your privacy and are committed to protecting your personal information.

## Information Collection

We collect information you provide directly to us, such as when you create an account, request a quote, or contact us.

## Use of Information

We use the information we collect to provide, maintain, and improve our services.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at contact@example.com.`;
    }
    if (locale === "fr") {
      return `# Politique de Confidentialité

Bienvenue chez Company Name. Nous respectons votre vie privée et nous nous engageons à protéger vos informations personnelles.

## Collecte d'Informations

Nous collectons les informations que vous nous fournissez directement, comme lorsque vous créez un compte, demandez un devis ou nous contactez.

## Utilisation des Informations

Nous utilisons les informations collectées pour fournir, maintenir et améliorer nos services.

## Contactez-nous

Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à contact@example.com.`;
    }
    return `# 隐私政策

欢迎使用 Company Name。我们尊重您的隐私，并致力于保护您的个人信息。

## 信息收集

我们收集您直接提供给我们的信息，例如当您创建账户、请求报价或联系我们时。

## 信息使用

我们使用收集的信息来提供、维护和改进我们的服务。

## 联系我们

如果您对本隐私政策有任何疑问，请通过 contact@example.com 联系我们。`;
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
