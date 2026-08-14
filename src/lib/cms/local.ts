// 本地数据库 CMS 客户端（使用Prisma）

import { prisma } from '@/lib/prisma';
import type { CMSArticle, CreateArticleInput, UpdateArticleInput, CMSProvider } from './types';

// 转换Prisma文章格式为统一格式
function transformArticle(article: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  author: string;
  category: string;
  tags: string[];
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CMSArticle {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage || undefined,
    author: article.author,
    category: article.category,
    tags: article.tags,
    status: article.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    publishedAt: article.publishedAt || undefined,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    source: 'local',
  };
}

// 获取所有文章
export async function getAllArticles(): Promise<CMSArticle[]> {
  const articles = await prisma.article.findMany({
    orderBy: { publishedAt: 'desc' },
  });
  
  return articles.map(transformArticle);
}

// 获取已发布的文章
export async function getPublishedArticles(): Promise<CMSArticle[]> {
  const articles = await prisma.article.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
  });
  
  return articles.map(transformArticle);
}

// 根据slug获取单篇文章
export async function getArticleBySlug(slug: string): Promise<CMSArticle | null> {
  const article = await prisma.article.findUnique({
    where: { slug },
  });
  
  return article ? transformArticle(article) : null;
}

// 根据ID获取单篇文章
export async function getArticleById(id: string): Promise<CMSArticle | null> {
  const article = await prisma.article.findUnique({
    where: { id },
  });
  
  return article ? transformArticle(article) : null;
}

// 按分类获取文章
export async function getArticlesByCategory(category: string): Promise<CMSArticle[]> {
  const articles = await prisma.article.findMany({
    where: { 
      category,
      status: 'PUBLISHED',
    },
    orderBy: { publishedAt: 'desc' },
  });
  
  return articles.map(transformArticle);
}

// 搜索文章
export async function searchArticles(searchTerm: string): Promise<CMSArticle[]> {
  const articles = await prisma.article.findMany({
    where: {
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { excerpt: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
      ],
    },
    orderBy: { publishedAt: 'desc' },
  });
  
  return articles.map(transformArticle);
}

// 创建文章
export async function createArticle(input: CreateArticleInput): Promise<CMSArticle> {
  const article = await prisma.article.create({
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage || null,
      author: input.author,
      category: input.category,
      tags: input.tags || [],
      status: input.status || 'DRAFT',
      publishedAt: input.publishedAt || null,
    },
  });
  
  return transformArticle(article);
}

// 更新文章
export async function updateArticle(id: string, input: UpdateArticleInput): Promise<CMSArticle> {
  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.slug && { slug: input.slug }),
      ...(input.excerpt && { excerpt: input.excerpt }),
      ...(input.content && { content: input.content }),
      ...(input.coverImage !== undefined && { coverImage: input.coverImage || null }),
      ...(input.author && { author: input.author }),
      ...(input.category && { category: input.category }),
      ...(input.tags && { tags: input.tags }),
      ...(input.status && { status: input.status }),
      ...(input.publishedAt !== undefined && { publishedAt: input.publishedAt || null }),
    },
  });
  
  return transformArticle(article);
}

// 删除文章
export async function deleteArticle(id: string): Promise<void> {
  await prisma.article.delete({
    where: { id },
  });
}

// 获取文章数量
export async function getArticleCount(status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'): Promise<number> {
  return prisma.article.count({
    where: status ? { status } : undefined,
  });
}

// 分页获取文章
export async function getArticlesPaginated(
  page: number = 1,
  limit: number = 10,
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
): Promise<{ articles: CMSArticle[]; total: number; pages: number }> {
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: status ? { status } : undefined,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.article.count({
      where: status ? { status } : undefined,
    }),
  ]);
  
  return {
    articles: articles.map(transformArticle),
    total,
    pages: Math.ceil(total / limit),
  };
}

// 导出CMSProvider接口实现
const localProvider: CMSProvider = {
  getAllArticles,
  getPublishedArticles,
  getArticleBySlug,
  getArticleById,
  getArticlesByCategory,
  searchArticles,
  createArticle,
  updateArticle,
  deleteArticle,
};

export default localProvider;
