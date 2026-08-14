// ==========================================
// 站点静态配置 (不依赖翻译)
// ==========================================

import { publicEnv } from "@/config/env/public";
import type { ServiceType } from "@/config/quote";

// 站点联系信息
export const siteLinks = {
  email: "contact@example.com",
  phone: "+1 (555) 000-0000",
  address: "Address to be configured",
};

// 站点基本信息
export const siteInfo = {
  name: "Company Name",
  url: publicEnv.siteUrl,
  ogImage: "/og-image.jpg",
};

// 社交媒体链接配置
// 注意: 所有属性都是可选的，要启用某个社交链接，请取消注释并填入实际URL
export const socialLinks: {
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
} = {
  // Add the new company's social links here.
};

// 友情链接配置
export const partnerLinks = [
  { name: "UPS", url: "https://www.ups.com" },
  // 可以添加更多友情链接
  { name: "FedEx", url: "https://www.fedex.com" },
  { name: "DHL", url: "https://www.dhl.com" },
];

// ==========================================
// 解决方案配置 (统一配置，避免重复定义)
// ==========================================
export const solutionConfigs = [
  { key: "fbaLastMile", serviceType: "FBA_LAST_MILE", icon: "Package", slug: "fba-last-mile", image: "/images/services/Express Delivery.jpg" },
  { key: "truckFreight", serviceType: "TRUCK_FREIGHT", icon: "Truck", slug: "truck-freight", image: "/images/services/Truck Delivery.jpg" },
  { key: "crossBorder", serviceType: "CROSS_BORDER", icon: "Globe", slug: "cross-border", image: "/images/services/Cross-border Logistics.jpg" },
  { key: "amazonFba", serviceType: "AMAZON_FBA", icon: "ShoppingCart", slug: "amazon-fba", image: "/images/services/Amazon FBA.jpg" },
  { key: "express", serviceType: "EXPRESS", icon: "Zap", slug: "express", image: "/images/services/Express-Service.jpg" },
  { key: "warehouse", serviceType: "WAREHOUSE", icon: "Warehouse", slug: "warehouse", image: "/images/services/Warehouse.jpg" },
  { key: "dropshipping", serviceType: "DROPSHIPPING", icon: "Ship", slug: "dropshipping", image: "/images/services/Dropshipping.jpg" },
  { key: "returns", serviceType: "RETURNS", icon: "RefreshCw", slug: "returns", image: "/images/services/Returns.jpg" },
] as const satisfies ReadonlyArray<{
  key: string;
  serviceType: Exclude<ServiceType, "OTHER">;
  icon: string;
  slug: string;
  image: string;
}>;

export type SolutionKey = typeof solutionConfigs[number]["key"];
export type SolutionSlug = typeof solutionConfigs[number]["slug"];

type ServiceTypeDictionary = {
  solutions?: Partial<Record<SolutionKey, { title?: string }>>;
  form?: { otherService?: string };
};

export function getServiceTypeOptions(t: ServiceTypeDictionary) {
  return [
    ...solutionConfigs.map(({ key, serviceType }) => ({
      value: serviceType,
      label: t.solutions?.[key]?.title || key,
    })),
    {
      value: "OTHER" as const,
      label: t.form?.otherService || "Other",
    },
  ];
}

export function getServiceTypeLabel(serviceType: string, t: ServiceTypeDictionary) {
  return getServiceTypeOptions(t).find((option) => option.value === serviceType)?.label || serviceType;
}

// ==========================================
// 动态配置函数 (依赖翻译)
// ==========================================

// 根据当前语言返回站点配置
export function getSiteConfig(t: any) {
  return {
    name: siteInfo.name,
    description: t.about?.description || "专业的跨境物流解决方案提供商",
    url: siteInfo.url,
    ogImage: siteInfo.ogImage,
    links: siteLinks,
    mainNav: [
      { title: t.nav?.home || "首页", href: "/" },
      {
        title: t.nav?.solutions || "解决方案",
        href: "/solutions",
        children: solutionConfigs.map(({ key, slug }) => ({
          title: (t.solutions?.[key] as { title: string } | undefined)?.title || key,
          href: `/solutions/${slug}`,
        })),
      },
      { title: t.nav?.about || "关于我们", href: "/about" },
      { title: t.nav?.news || "新闻动态", href: "/news" },
      { title: t.nav?.contact || "联系我们", href: "/contact" },
    ],
    footerNav: [
      { title: t.nav?.solutions || "解决方案", href: "/solutions" },
      { title: t.nav?.about || "关于我们", href: "/about" },
      { title: t.nav?.privacy || "隐私政策", href: "/privacy" },
      { title: t.nav?.terms || "服务条款", href: "/terms" },
    ],
  };
}

// 获取解决方案列表配置（带翻译）
export function getSolutionsConfig(t: any) {
  return solutionConfigs.map(({ key, serviceType, icon, slug, image }) => {
    const solutionData = t.solutions?.[key] as { title: string; description: string; features?: string[] } | undefined;
    return {
      id: key,
      key,
      serviceType,
      title: solutionData?.title || key,
      description: solutionData?.description || "",
      features: solutionData?.features || [],
      icon,
      slug,
      image,
      href: `/solutions/${slug}`,
    };
  });
}

// 根据slug获取单个解决方案配置
export function getSolutionBySlug(slug: string) {
  return solutionConfigs.find(s => s.slug === slug);
}

// 统计数据配置
export function getStatsConfig(t: any) {
  return [
    {
      label: t.stats.customers,
      value: "0",
      suffix: "",
      description: t.hero.customers,
    },
    {
      label: t.stats.orders,
      value: "0",
      suffix: "",
      description: t.features.efficient.description,
    },
    {
      label: t.stats.warehouse,
      value: "0",
      suffix: "",
      description: t.about.advantages?.[1] || t.stats.warehouse,
    },
    {
      label: t.stats.years,
      value: "0",
      suffix: "",
      description: t.hero.experience,
    },
  ];
}

// 合作伙伴配置
export function getPartnersConfig() {
  return [
    { name: "Amazon", logo: "/partners/amazon.svg" },
    { name: "FedEx", logo: "/partners/fedex.svg" },
    { name: "UPS", logo: "/partners/ups.svg" },
    { name: "Canada Post", logo: "/partners/canada-post.svg" },
    { name: "DHL", logo: "/partners/dhl.svg" },
  ];
}
