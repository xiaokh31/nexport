// Contentful CMS 客户端
import { createClient, type ContentfulClientApi } from 'contentful';
import { contentfulConfig } from './config';
import type { CMSArticle } from './types';

// 创建Contentful客户端实例
let contentfulClient: ContentfulClientApi<undefined> | null = null;

export function getContentfulClient(): ContentfulClientApi<undefined> {
  if (!contentfulClient) {
    contentfulClient = createClient({
      space: contentfulConfig.spaceId,
      accessToken: contentfulConfig.accessToken,
      environment: contentfulConfig.environment,
    });
  }
  return contentfulClient;
}

// 转换Contentful文章格式为统一格式
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformArticle(entry: any): CMSArticle {
  const fields = entry.fields;
  
  return {
    id: entry.sys.id,
    title: String(fields.title || ''),
    slug: String(fields.slug || ''),
    excerpt: String(fields.excerpt || ''),
    content: String(fields.content || ''),
    coverImage: fields.coverImage?.fields?.file?.url 
      ? `https:${fields.coverImage.fields.file.url}` 
      : undefined,
    author: String(fields.author || ''),
    category: String(fields.category || ''),
    tags: Array.isArray(fields.tags) ? fields.tags : [],
    status: (fields.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') || 'DRAFT',
    publishedAt: fields.publishedAt ? new Date(fields.publishedAt) : undefined,
    createdAt: new Date(entry.sys.createdAt),
    updatedAt: new Date(entry.sys.updatedAt),
    source: 'contentful',
  };
}

// 获取所有文章
export async function getAllArticles(): Promise<CMSArticle[]> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    order: ['-fields.publishedAt'],
  });
  
  return response.items.map(transformArticle);
}

// 获取已发布的文章
export async function getPublishedArticles(): Promise<CMSArticle[]> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    'fields.status': 'PUBLISHED',
    order: ['-fields.publishedAt'],
  });
  
  return response.items.map(transformArticle);
}

// 根据slug获取单篇文章
export async function getArticleBySlug(slug: string): Promise<CMSArticle | null> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    'fields.slug': slug,
    limit: 1,
  });
  
  return response.items.length > 0 ? transformArticle(response.items[0]) : null;
}

// 根据ID获取单篇文章
export async function getArticleById(id: string): Promise<CMSArticle | null> {
  const client = getContentfulClient();
  
  try {
    const entry = await client.getEntry(id);
    return transformArticle(entry);
  } catch {
    return null;
  }
}

// 按分类获取文章
export async function getArticlesByCategory(category: string): Promise<CMSArticle[]> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    'fields.category': category,
    'fields.status': 'PUBLISHED',
    order: ['-fields.publishedAt'],
  });
  
  return response.items.map(transformArticle);
}

// 搜索文章
export async function searchArticles(searchTerm: string): Promise<CMSArticle[]> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    query: searchTerm,
    order: ['-fields.publishedAt'],
  });
  
  return response.items.map(transformArticle);
}

// 获取所有分类
export async function getCategories(): Promise<string[]> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    select: ['fields.category'],
  });
  
  const categories = new Set<string>();
  response.items.forEach(item => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields = item.fields as any;
    if (fields.category) {
      categories.add(String(fields.category));
    }
  });
  
  return Array.from(categories);
}

// 获取文章数量
export async function getArticleCount(): Promise<number> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    limit: 0,
  });
  
  return response.total;
}

// 分页获取文章
export async function getArticlesPaginated(
  page: number = 1, 
  limit: number = 10
): Promise<{ articles: CMSArticle[]; total: number; pages: number }> {
  const client = getContentfulClient();
  
  const response = await client.getEntries({
    content_type: 'article',
    'fields.status': 'PUBLISHED',
    order: ['-fields.publishedAt'],
    skip: (page - 1) * limit,
    limit,
  });
  
  return {
    articles: response.items.map(transformArticle),
    total: response.total,
    pages: Math.ceil(response.total / limit),
  };
}
