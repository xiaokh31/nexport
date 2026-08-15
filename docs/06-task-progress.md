🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 10 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～002；登录/注册在业务数据访问前执行 PostgreSQL 限流与服务端 CAPTCHA，HMAC 数据最小化、可信代理和 fail-closed 边界已通过 L0 与纯逻辑验收。
Plans: 下一项按依赖顺序执行 SEC-003，修复游客询价所有权与注册历史认领边界。
Problems: node_modules 与 Playwright 浏览器尚未安装；本次新增的 Vitest/Playwright 用例及 Prisma、lint、typecheck、数据库运行态 L1/L2 验证按计划延后到 QA，pnpm-lock.yaml 仍待 QA-001 统一刷新。
