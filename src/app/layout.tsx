import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header, Footer } from "@/components/layout";
import { CookieConsent } from "@/components/cookie-consent";
import { getSiteConfig } from "@/config/site-config";
import { LocaleProvider } from "@/i18n/locale-context";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import Providers from './providers'

import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrganizationSchema, WebsiteSchema, LocalBusinessSchema } from "@/components/seo/structured-data";
import { publicEnv } from "@/config/env/public";
import { serverEnv } from "@/config/env/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = publicEnv.siteUrl;

// SEO优化的Viewport配置
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Company Name | 专业跨境物流服务",
    template: `%s | Company Name`,
  },
  description: "专业跨境物流服务商，提供FBA尾程、卡派服务、跨境物流、Amazon FBA、仓储管理、一件代发、退货换标等物流解决方案。",
  keywords: [
    "加拿大物流",
    "跨境物流",
    "FBA尾程提拆派服务",
    "FBA Last Mile",
    "卡派服务",
    "Truck Freight",
    "北美跨境物流",
    "Cross-border logistics",
    "Amazon FBA",
    "仓储管理",
    "Warehouse Management",
    "一件代发",
    "Dropshipping",
    "退货换标",
    "Returns and Relabeling",
    "跨境电商物流",
    "e-commerce logistics",
    "Canada logistics"
  ],
  authors: [{ name: "Company Name", url: siteUrl }],
  creator: "Company Name",
  publisher: "Company Name",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    alternateLocale: ["en_US", "fr_CA"],
    url: siteUrl,
    title: "Company Name | 专业跨境物流服务",
    description: "专业跨境物流服务商，提供FBA、卡派服务、跨境物流、仓储管理、一件代发和退货处理等物流解决方案。",
    siteName: "Company Name",
  },
  twitter: {
    card: "summary_large_image",
    title: "Company Name | 专业跨境物流服务",
    description: "专业跨境物流服务商，提供FBA、卡派服务、跨境物流、仓储管理、一件代发和退货处理等物流解决方案。",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: serverEnv.googleSiteVerification,
    // Bing Webmaster Tools验证
    // 在Bing Webmaster中添加网站后，获取验证代码并设置环境变量
    other: {
      "msvalidate.01": serverEnv.bingSiteVerification || "",
      // 百度搜索资源平台验证
      // 在百度站长平台添加网站后，获取验证代码并设置环境变量
      "baidu-site-verification": serverEnv.baiduSiteVerification || "",
      // Yandex (俄罗斯搜索引擎)
      "yandex-verification": serverEnv.yandexSiteVerification || "",
    },
  },
  alternates: {
    canonical: siteUrl,
    languages: {
      "zh-CN": `${siteUrl}/zh`,
      "en-US": `${siteUrl}/en`,
      "fr-CA": `${siteUrl}/fr`,
    },
  },
  manifest: "/manifest.json",
  category: "logistics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 获取服务端Session（必须传入authOptions以正确解析自定义字段如role）
  const session = await getServerSession(authOptions);
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <Providers session={session}>
          {/* SEO结构化数据 */}
          <OrganizationSchema />
          <WebsiteSchema />
          <LocalBusinessSchema />
          <LocaleProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <CookieConsent />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
