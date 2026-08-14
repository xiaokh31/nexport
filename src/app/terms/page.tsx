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
      return `<h2>Terms of Service</h2>
<p>Welcome to Company Name. By using our services, you agree to these terms.</p>
<h3>Service Description</h3>
<p>We provide cross-border e-commerce logistics services including FBA last mile, truck freight, warehousing, dropshipping, and returns handling.</p>
<h3>User Responsibilities</h3>
<p>Users must provide accurate information when requesting quotes and using our services.</p>
<h3>Limitation of Liability</h3>
<p>Our liability is limited to the extent permitted by applicable law.</p>
<h3>Contact Us</h3>
<p>If you have any questions about these Terms, please contact us at contact@example.com</p>`;
    }
    if (locale === "fr") {
      return `<h2>Conditions d'Utilisation</h2>
<p>Bienvenue chez Company Name. En utilisant nos services, vous acceptez ces conditions.</p>
<h3>Description du Service</h3>
<p>Nous fournissons des services de logistique e-commerce transfrontalière, y compris le dernier kilomètre FBA, le fret routier, l'entreposage, le dropshipping et la gestion des retours.</p>
<h3>Responsabilités de l'Utilisateur</h3>
<p>Les utilisateurs doivent fournir des informations exactes lors de la demande de devis et de l'utilisation de nos services.</p>
<h3>Limitation de Responsabilité</h3>
<p>Notre responsabilité est limitée dans la mesure permise par la loi applicable.</p>
<h3>Contactez-nous</h3>
<p>Si vous avez des questions concernant ces conditions, veuillez nous contacter à contact@example.com</p>`;
    }
    return `<h2>服务条款</h2>
<p>欢迎使用 Company Name。使用我们的服务即表示您同意以下条款。</p>
<h3>服务说明</h3>
<p>我们提供跨境电商物流服务，包括FBA、卡派服务、仓储管理、一件代发和退货换标等。</p>
<h3>用户责任</h3>
<p>用户在请求报价和使用我们的服务时必须提供准确的信息。</p>
<h3>责任限制</h3>
<p>我们的责任以适用法律允许的范围为限。</p>
<h3>联系我们</h3>
<p>如果您对本服务条款有任何疑问，请通过 contact@example.com 联系我们。</p>`;
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
