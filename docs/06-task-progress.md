🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 11 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003；询价创建与用户列表统一由 session `userId` 确定所有权，游客保持匿名，注册无邮箱历史认领，L0 行为、语法、静态边界及 LICENSE 哈希检查通过。
Plans: 下一项按依赖顺序执行 RBAC-001，统一后台 capability matrix、服务端授权和管理员初始化边界。
Problems: node_modules 与 Playwright 浏览器尚未安装；本次新增的 Vitest、隔离 PostgreSQL 集成与 Playwright 用例及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA，pnpm-lock.yaml 仍待 QA-001 统一刷新。
