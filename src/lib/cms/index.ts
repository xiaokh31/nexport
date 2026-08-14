// CMS统一接口 - 支持Sanity、Contentful和本地数据库切换

import { CMS_PROVIDER, validateConfig, getCMSStatus } from './config';
import * as sanityClient from './sanity';
import * as contentfulClient from './contentful';
import * as localClient from './local';
import type { CMSArticle, CreateArticleInput, UpdateArticleInput, CMSProvider } from './types';

// 重新导出类型
export * from './types';
export { getCMSStatus } from './config';

// 获取当前CMS客户端
function getCurrentClient(): CMSProvider {
  const provider = CMS_PROVIDER;
  
  switch (provider) {
    case 'sanity':
      if (!validateConfig('sanity')) {
        console.warn('Sanity配置不完整，回退到本地数据库');
        return localClient;
      }
      return sanityClient;
      
    case 'contentful':
      if (!validateConfig('contentful')) {
        console.warn('Contentful配置不完整，回退到本地数据库');
        return localClient;
      }
      return contentfulClient;
      
    case 'local':
    default:
      return localClient;
  }
}

// ==================== 查询方法 ====================

/**
 * 获取所有文章
 */
export async function getAllArticles(): Promise<CMSArticle[]> {
  const client = getCurrentClient();
  return client.getAllArticles();
}

/**
 * 获取已发布的文章
 */
export async function getPublishedArticles(): Promise<CMSArticle[]> {
  const client = getCurrentClient();
  return client.getPublishedArticles();
}

/**
 * 根据slug获取文章
 */
export async function getArticleBySlug(slug: string): Promise<CMSArticle | null> {
  const client = getCurrentClient();
  return client.getArticleBySlug(slug);
}

/**
 * 根据ID获取文章
 */
export async function getArticleById(id: string): Promise<CMSArticle | null> {
  const client = getCurrentClient();
  return client.getArticleById(id);
}

/**
 * 按分类获取文章
 */
export async function getArticlesByCategory(category: string): Promise<CMSArticle[]> {
  const client = getCurrentClient();
  return client.getArticlesByCategory(category);
}

/**
 * 搜索文章
 */
export async function searchArticles(searchTerm: string): Promise<CMSArticle[]> {
  const client = getCurrentClient();
  return client.searchArticles(searchTerm);
}

// ==================== 写入方法 ====================

/**
 * 创建文章
 * 注意：仅在支持写入的CMS或本地模式下可用
 */
export async function createArticle(article: CreateArticleInput): Promise<CMSArticle> {
  const client = getCurrentClient();
  
  if (!client.createArticle) {
    throw new Error(`当前CMS提供商(${CMS_PROVIDER})不支持创建文章`);
  }
  
  return client.createArticle(article);
}

/**
 * 更新文章
 * 注意：仅在支持写入的CMS或本地模式下可用
 */
export async function updateArticle(id: string, article: UpdateArticleInput): Promise<CMSArticle> {
  const client = getCurrentClient();
  
  if (!client.updateArticle) {
    throw new Error(`当前CMS提供商(${CMS_PROVIDER})不支持更新文章`);
  }
  
  return client.updateArticle(id, article);
}

/**
 * 删除文章
 * 注意：仅在支持写入的CMS或本地模式下可用
 */
export async function deleteArticle(id: string): Promise<void> {
  const client = getCurrentClient();
  
  if (!client.deleteArticle) {
    throw new Error(`当前CMS提供商(${CMS_PROVIDER})不支持删除文章`);
  }
  
  return client.deleteArticle(id);
}

// ==================== 聚合查询 ====================

/**
 * 从多个CMS获取文章（聚合模式）
 * 用于混合使用多个CMS的场景
 */
export async function getArticlesFromAllSources(): Promise<CMSArticle[]> {
  const results: CMSArticle[] = [];
  const errors: string[] = [];
  
  // 尝试从本地获取
  try {
    const localArticles = await localClient.getPublishedArticles();
    results.push(...localArticles);
  } catch (e) {
    errors.push(`本地: ${e}`);
  }
  
  // 尝试从Sanity获取
  if (validateConfig('sanity')) {
    try {
      const sanityArticles = await sanityClient.getPublishedArticles();
      results.push(...sanityArticles);
    } catch (e) {
      errors.push(`Sanity: ${e}`);
    }
  }
  
  // 尝试从Contentful获取
  if (validateConfig('contentful')) {
    try {
      const contentfulArticles = await contentfulClient.getPublishedArticles();
      results.push(...contentfulArticles);
    } catch (e) {
      errors.push(`Contentful: ${e}`);
    }
  }
  
  if (errors.length > 0) {
    console.warn('部分CMS查询失败:', errors);
  }
  
  // 按发布时间排序
  return results.sort((a, b) => {
    const dateA = a.publishedAt?.getTime() || 0;
    const dateB = b.publishedAt?.getTime() || 0;
    return dateB - dateA;
  });
}
