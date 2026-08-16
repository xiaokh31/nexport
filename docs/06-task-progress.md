🚚 Nexport 开发（截至 2026-08-15）
Progress: 已完成 19 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001、ARTICLE-001、SEO-001、UI-001。UI 基础已完成 Dock Navy/Steel Blue/Concrete/Signal Amber/Pallet Kraft/Paper White 与语义状态/sidebar token、离线稳定字体回退、全局间距/边框/焦点/reduced-motion、skip link、单一语言切换器、320–1920 响应式 Header、具名移动 Sheet、占位资料安全隐藏 Footer、44px 基础控件及前后台 workspace sidebar，并补齐对比度单元边界和 Playwright 响应式/键盘验收用例；L0 门禁通过。
Plans: 下一任务为 UI-002（首页与解决方案重构），完成后进入 UI-003（询价与新闻页面重构）。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF/AUTH/QUOTE/ARTICLE/SEO/UI 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
