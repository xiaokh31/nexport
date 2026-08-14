"use client";

import { useState, useEffect } from "react";
import { useLocale } from "@/i18n/locale-context";
import { Loader2 } from "lucide-react";

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
  const { locale, t } = useLocale();
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
      return `<h2>Privacy Policy</h2>
<p>Welcome to Company Name. We respect your privacy and are committed to protecting your personal information.</p>
<h3>Information Collection</h3>
<p>We collect information you provide directly to us, such as when you create an account, request a quote, or contact us.</p>
<h3>Use of Information</h3>
<p>We use the information we collect to provide, maintain, and improve our services.</p>
<h3>Contact Us</h3>
<p>If you have any questions about this Privacy Policy, please contact us at contact@example.com</p>`;
    }
    if (locale === "fr") {
      return `<h2>Politique de Confidentialité</h2>
<p>Bienvenue chez Company Name. Nous respectons votre vie privée et nous nous engageons à protéger vos informations personnelles.</p>
<h3>Collecte d'Informations</h3>
<p>Nous collectons les informations que vous nous fournissez directement, comme lorsque vous créez un compte, demandez un devis ou nous contactez.</p>
<h3>Utilisation des Informations</h3>
<p>Nous utilisons les informations collectées pour fournir, maintenir et améliorer nos services.</p>
<h3>Contactez-nous</h3>
<p>Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à contact@example.com</p>`;
    }
    return `<h2>隐私政策</h2>
<p>欢迎使用 Company Name。我们尊重您的隐私，并致力于保护您的个人信息。</p>
<h3>信息收集</h3>
<p>我们收集您直接提供给我们的信息，例如当您创建账户、请求报价或联系我们时。</p>
<h3>信息使用</h3>
<p>我们使用收集的信息来提供、维护和改进我们的服务。</p>
<h3>联系我们</h3>
<p>如果您对本隐私政策有任何疑问，请通过 contact@example.com 联系我们。</p>`;
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
          <div 
            className="max-w-3xl mx-auto prose prose-slate dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: getContent() }}
          />
        </div>
      </section>
    </>
  );
}
