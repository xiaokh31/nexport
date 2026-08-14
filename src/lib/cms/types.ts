// CMS 统一类型定义

// 基础文章类型（数据库模型）
export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: string;
  category: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// CMS文章类型（包含来源信息）
export interface CMSArticle extends Article {
  source: 'sanity' | 'contentful' | 'local';
}

// 文章创建输入
export interface CreateArticleInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: string;
  category: string;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
}

// 文章更新输入
export interface UpdateArticleInput {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  author?: string;
  category?: string;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt?: Date;
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// 文章过滤选项
export interface ArticleFilters {
  category?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  author?: string;
  search?: string;
}

// CMS提供商接口
export interface CMSProvider {
  // 查询方法
  getAllArticles(): Promise<CMSArticle[]>;
  getPublishedArticles(): Promise<CMSArticle[]>;
  getArticleBySlug(slug: string): Promise<CMSArticle | null>;
  getArticleById(id: string): Promise<CMSArticle | null>;
  getArticlesByCategory(category: string): Promise<CMSArticle[]>;
  searchArticles(searchTerm: string): Promise<CMSArticle[]>;
  
  // 写入方法（可选，部分CMS可能只读）
  createArticle?(article: CreateArticleInput): Promise<CMSArticle>;
  updateArticle?(id: string, article: UpdateArticleInput): Promise<CMSArticle>;
  deleteArticle?(id: string): Promise<void>;
}

// 分类定义
export const ARTICLE_CATEGORIES = [
  { value: 'company', label: '公司新闻' },
  { value: 'industry', label: '行业资讯' },
  { value: 'service', label: '服务公告' },
  { value: 'policy', label: '政策解读' },
] as const;

// 文章状态定义
export const ARTICLE_STATUS = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PUBLISHED', label: '已发布' },
  { value: 'ARCHIVED', label: '已归档' },
] as const;
