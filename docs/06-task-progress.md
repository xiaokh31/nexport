🚚 Nexport 开发（截至 2026-08-15）
Progress: 已完成 18 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001、ARTICLE-001、SEO-001。SEO 已完成新闻服务端列表/详情与可抓取分页、PUBLISHED 公开边界、动态 metadata/canonical/Open Graph、安全 Article JSON-LD、真实文章时间 sitemap、统一 robots 私有路由、虚假 hreflang/占位企业 schema 清理、方案 metadata/Breadcrumb/Service schema、首页最新文章和方案相关文章，并补齐单元/集成/E2E 验收用例；L0 门禁通过。
Plans: 下一任务为 UI-001（设计 token、字体与全局框架），完成后进入 UI-002（首页与解决方案重构）。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF/AUTH/QUOTE/ARTICLE/SEO 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
