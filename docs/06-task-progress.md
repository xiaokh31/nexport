🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 9 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001；凭证归一化与统一错误、Google 条件入口、登录历史内部写入边界、邮件 HTML 转义和单一发送 API 已通过 L0 静态与纯逻辑验收。
Plans: 下一项按依赖顺序执行 SEC-002，建立服务端 CAPTCHA fail-closed、持久化限流与可信代理边界。
Problems: node_modules 与 Playwright 浏览器尚未安装；本次新增的 Vitest/Playwright 用例及 Prisma、lint、typecheck、数据库运行态 L1/L2 验证按计划延后到 QA，pnpm-lock.yaml 仍待 QA-001 统一刷新。
