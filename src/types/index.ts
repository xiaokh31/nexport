// 通用类型定义

// 导航链接
export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  children?: NavItem[];
}

// 站点配置
export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    email: string;
    phone: string;
    address: string;
  };
  mainNav: NavItem[];
  footerNav: NavItem[];
}

// 服务类型
export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  features: string[];
}

// 优势/统计数据
export interface Stat {
  label: string;
  value: string;
  suffix?: string;
  description?: string;
}

// 询价表单
export interface QuoteFormData {
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
}

// 联系表单
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

// 新闻/文章
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: string;
  publishedAt: Date;
  category: string;
  tags: string[];
}

// API 响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
