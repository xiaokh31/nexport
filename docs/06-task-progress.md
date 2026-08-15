🚚 Nexport 开发（截至 2026-08-15）
Progress: 已完成 17 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001、ARTICLE-001。ARTICLE 已完成新建/编辑/API 共享全字段 Zod 契约、规范化唯一 slug 与 409 冲突、并发行锁下的首次发布时间/发布后 slug 锁定、作者关系、完整编辑字段、ADMIN/授权 STAFF CRUD、只读已发布公开边界、受保护 SAFE-001 预览与缓存失效，并补齐单元/集成/E2E 验收用例；L0 门禁通过。
Plans: 按业务批次顺序，下一任务为 SEO-001（新闻 SSR、metadata、JSON-LD 与 sitemap），随后进入 UI-001。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF/AUTH/QUOTE/ARTICLE 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
