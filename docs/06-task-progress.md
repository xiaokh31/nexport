🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 16 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001。QUOTE 已完成九种 serviceType/方案预选、CAPTCHA 与双维度持久限流、版本化提交指纹和安全重试、后台行锁状态机/字段白名单/软删除历史约束、客户发布视图、事务通知及并发/重放/匿名验收用例；L0 门禁通过。
Plans: 按业务批次顺序，下一任务为 ARTICLE-001（文章编辑与发布闭环），随后执行 SEO-001。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF/AUTH/QUOTE 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
