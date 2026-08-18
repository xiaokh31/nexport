import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header, Footer } from "@/components/layout";
import { CookieConsent } from "@/components/cookie-consent";
import { LocaleProvider } from "@/i18n/locale-context";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import Providers from "./providers";

import { publicEnv } from "@/config/env/public";
import { serverEnv } from "@/config/env/server";
import { siteInfo } from "@/config/site-config";
import { getDeploymentPolicy } from "@/config/deployment";

const siteUrl = publicEnv.siteUrl;
const { indexingEnabled } = getDeploymentPolicy();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFBF8" },
    { media: "(prefers-color-scheme: dark)", color: "#102632" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteInfo.shortName} | 海外仓储、订单履约与运输衔接`,
    template: `%s | ${siteInfo.shortName}`,
  },
  description: "面向跨境电商卖家、品牌方和物流伙伴，提供海外仓储、订单履约、FBA 准备与交付及运输需求询价入口。",
  keywords: [
    "海外仓储",
    "订单履约",
    "FBA 入仓准备",
    "FBA Last Mile",
    "卡车运输",
    "Truck Freight",
    "跨境运输",
    "Cross-border logistics",
    "一件代发",
    "Dropshipping",
    "退货换标",
    "Returns and Relabeling"
  ],
  authors: [{ name: siteInfo.legalName, url: siteUrl }],
  creator: siteInfo.legalName,
  publisher: siteInfo.legalName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteUrl,
    title: `${siteInfo.shortName} | 海外仓储、订单履约与运输衔接`,
    description: "按仓储履约、FBA 准备与交付、运输衔接查看服务边界并提交询价。",
    siteName: siteInfo.shortName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteInfo.shortName} | 海外仓储、订单履约与运输衔接`,
    description: "按仓储履约、FBA 准备与交付、运输衔接查看服务边界并提交询价。",
  },
  robots: {
    index: indexingEnabled,
    follow: indexingEnabled,
    googleBot: {
      index: indexingEnabled,
      follow: indexingEnabled,
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
  },
  manifest: "/manifest.webmanifest",
  category: "logistics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>
        <Providers session={session}>
          <LocaleProvider>
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1">
              {children}
            </main>
            <Footer />
            <CookieConsent />
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
