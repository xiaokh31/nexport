🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 14 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001。通知 domain service、报价事务 outbox、稳定 Resend 幂等键、租约 worker、受保护 cron、退避与人工复核、UUID 广播指纹幂等、持久接收人数、用户归属校验和“通知管理”命名均已完成；NOTIF L0 门禁通过。
Plans: 按业务批次顺序，下一任务为 AUTH-001（邮箱验证与安全注册闭环），随后执行 QUOTE-001。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE/NOTIF 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
