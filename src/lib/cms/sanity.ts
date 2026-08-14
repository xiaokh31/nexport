// Sanity CMS 客户端
import { createClient, type SanityClient } from '@sanity/client';
import { sanityConfig } from './config';
import type { Article, CMSArticle } from './types';

// 创建Sanity客户端实例
let sanityClient: SanityClient | null = null;

export function getSanityClient(): SanityClient {
  if (!sanityClient) {
    sanityClient = createClient({
      projectId: sanityConfig.projectId,
      dataset: sanityConfig.dataset,
      apiVersion: sanityConfig.apiVersion,
      useCdn: sanityConfig.useCdn,
      token: sanityConfig.token || undefined,
    });
  }
  return sanityClient;
}

// GROQ 查询语句
const articleFields = `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  content,
  "coverImage": coverImage.asset->url,
  author,
  category,
  tags,
  status,
  publishedAt,
  _createdAt,
  _updatedAt
`;

// 转换Sanity文章格式为统一格式
function transformArticle(sanityArticle: Record<string, unknown>): CMSArticle {
  return {
    id: sanityArticle._id as string,
    title: sanityArticle.title as string,
    slug: sanityArticle.slug as string,
    excerpt: sanityArticle.excerpt as string,
    content: sanityArticle.content as string,
    coverImage: sanityArticle.coverImage as string | undefined,
    author: sanityArticle.author as string,
    category: sanityArticle.category as string,
    tags: sanityArticle.tags as string[] || [],
    status: sanityArticle.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    publishedAt: sanityArticle.publishedAt ? new Date(sanityArticle.publishedAt as string) : undefined,
    createdAt: new Date(sanityArticle._createdAt as string),
    updatedAt: new Date(sanityArticle._updatedAt as string),
    source: 'sanity',
  };
}

// 获取所有文章
export async function getAllArticles(): Promise<CMSArticle[]> {
  const client = getSanityClient();
  const query = `*[_type == "article"] | order(publishedAt desc) {
    ${articleFields}
  }`;
  
  const articles = await client.fetch(query);
  return articles.map(transformArticle);
}

// 获取已发布的文章
export async function getPublishedArticles(): Promise<CMSArticle[]> {
  const client = getSanityClient();
  const query = `*[_type == "article" && status == "PUBLISHED"] | order(publishedAt desc) {
    ${articleFields}
  }`;
  
  const articles = await client.fetch(query);
  return articles.map(transformArticle);
}

// 根据slug获取单篇文章
export async function getArticleBySlug(slug: string): Promise<CMSArticle | null> {
  const client = getSanityClient();
  const query = `*[_type == "article" && slug.current == $slug][0] {
    ${articleFields}
  }`;
  
  const article = await client.fetch(query, { slug });
  return article ? transformArticle(article) : null;
}

// 根据ID获取单篇文章
export async function getArticleById(id: string): Promise<CMSArticle | null> {
  const client = getSanityClient();
  const query = `*[_type == "article" && _id == $id][0] {
    ${articleFields}
  }`;
  
  const article = await client.fetch(query, { id });
  return article ? transformArticle(article) : null;
}

// 按分类获取文章
export async function getArticlesByCategory(category: string): Promise<CMSArticle[]> {
  const client = getSanityClient();
  const query = `*[_type == "article" && category == $category && status == "PUBLISHED"] | order(publishedAt desc) {
    ${articleFields}
  }`;
  
  const articles = await client.fetch(query, { category });
  return articles.map(transformArticle);
}

// 搜索文章
export async function searchArticles(searchTerm: string): Promise<CMSArticle[]> {
  const client = getSanityClient();
  const query = `*[_type == "article" && (
    title match $term || 
    excerpt match $term || 
    content match $term
  )] | order(publishedAt desc) {
    ${articleFields}
  }`;
  
  const articles = await client.fetch(query, { term: `*${searchTerm}*` });
  return articles.map(transformArticle);
}

// 创建文章（需要token）
export async function createArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<CMSArticle> {
  const client = getSanityClient();
  
  const doc = {
    _type: 'article',
    title: article.title,
    slug: { _type: 'slug', current: article.slug },
    excerpt: article.excerpt,
    content: article.content,
    coverImage: article.coverImage,
    author: article.author,
    category: article.category,
    tags: article.tags,
    status: article.status,
    publishedAt: article.publishedAt?.toISOString(),
  };
  
  const created = await client.create(doc);
  return transformArticle(created);
}

// 更新文章（需要token）
export async function updateArticle(id: string, article: Partial<Article>): Promise<CMSArticle> {
  const client = getSanityClient();
  
  const updates: Record<string, unknown> = {};
  if (article.title) updates.title = article.title;
  if (article.slug) updates.slug = { _type: 'slug', current: article.slug };
  if (article.excerpt) updates.excerpt = article.excerpt;
  if (article.content) updates.content = article.content;
  if (article.coverImage !== undefined) updates.coverImage = article.coverImage;
  if (article.author) updates.author = article.author;
  if (article.category) updates.category = article.category;
  if (article.tags) updates.tags = article.tags;
  if (article.status) updates.status = article.status;
  if (article.publishedAt) updates.publishedAt = article.publishedAt.toISOString();
  
  const updated = await client.patch(id).set(updates).commit();
  return transformArticle(updated);
}

// 删除文章（需要token）
export async function deleteArticle(id: string): Promise<void> {
  const client = getSanityClient();
  await client.delete(id);
}
