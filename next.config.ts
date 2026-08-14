import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 图片优化配置
  images: {
    // 允许的远程图片域名
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google 头像
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub 头像
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io', // Sanity CMS 图片
      },
      {
        protocol: 'https',
        hostname: 'images.ctfassets.net', // Contentful 图片
      },
    ],
    // 图片格式优化
    formats: ['image/avif', 'image/webp'],
  },

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // 安全头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },

  // 生产环境优化
  ...(process.env.NODE_ENV === 'production' && {
    // 压缩输出
    compress: true,
    // 构建时忽略 TypeScript 和 ESLint 错误（仅在紧急部署时使用）
    // typescript: { ignoreBuildErrors: true },
    // eslint: { ignoreDuringBuilds: true },
  }),
};

export default nextConfig;
