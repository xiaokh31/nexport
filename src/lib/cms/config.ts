// CMS Configuration
// Headless CMS切换配置

export type CMSProvider = 'sanity' | 'contentful' | 'local';

// 当前使用的CMS提供商，可通过环境变量配置
export const CMS_PROVIDER: CMSProvider = 
  (process.env.CMS_PROVIDER as CMSProvider) || 'local';

// Sanity配置
export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN || '',
};

// Contentful配置
export const contentfulConfig = {
  spaceId: process.env.NEXT_PUBLIC_CONTENTFUL_SPACE_ID || '',
  accessToken: process.env.NEXT_PUBLIC_CONTENTFUL_ACCESS_TOKEN || '',
  previewToken: process.env.CONTENTFUL_PREVIEW_TOKEN || '',
  environment: process.env.NEXT_PUBLIC_CONTENTFUL_ENVIRONMENT || 'master',
};

// 验证配置是否完整
export function validateConfig(provider: CMSProvider): boolean {
  switch (provider) {
    case 'sanity':
      return !!(sanityConfig.projectId && sanityConfig.dataset);
    case 'contentful':
      return !!(contentfulConfig.spaceId && contentfulConfig.accessToken);
    case 'local':
      return true;
    default:
      return false;
  }
}

// 获取当前CMS状态
export function getCMSStatus() {
  return {
    provider: CMS_PROVIDER,
    isConfigured: validateConfig(CMS_PROVIDER),
    sanityConfigured: validateConfig('sanity'),
    contentfulConfigured: validateConfig('contentful'),
  };
}
