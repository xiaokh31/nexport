🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 13 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001；Article/Page 已统一为禁用原始 HTML 的 Markdown，管理写入执行共享 Zod 策略，新闻服务端输出、privacy/terms 和后台预览复用同一渲染器，CSP/现代 headers、JSON-LD 逃逸及恶意载荷回归已通过 L0。
Plans: 下一项按依赖顺序执行 NOTIF-001，集中通知 domain service、偏好判定、站内 link 校验、邮件 outbox 与 worker 幂等重试。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC/SAFE 新增的 Vitest、隔离 PostgreSQL 与 Playwright API/UI 用例，以及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA；react-markdown/remark-gfm 已登记到 package.json，pnpm-lock.yaml 仍待 QA-001 统一刷新。
