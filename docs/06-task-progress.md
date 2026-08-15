🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 15 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001。AUTH 已完成注册事务、HMAC/哈希 challenge、无可重放 token 的验证邮件 outbox、一次性消费、验证/限流重发 API、验证页面、Credentials 未验证门禁及过期/重放/并发/失败重试验收用例；L0 门禁通过。
Plans: 按业务批次顺序，下一任务为 QUOTE-001（询价—报价—通知端到端修复），随后执行 ARTICLE-001。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF/AUTH 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
