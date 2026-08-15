🚚 Nexport 开发（截至 2026-08-14）
Progress: 已完成 12 个任务：FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001；九项 capability 统一 API/UI 权限，敏感请求实时读取数据库，STAFF/FINANCE/WAREHOUSE、最后 ADMIN 和幂等管理员提升边界已通过 L0 行为、语法、静态覆盖及 LICENSE 检查。
Plans: 下一项按依赖顺序执行 SAFE-001，统一 Markdown 内容管线、服务端净化渲染、预览和安全 headers。
Problems: node_modules 与 Playwright 浏览器尚未安装；RBAC 新增的 Vitest、隔离 PostgreSQL 集成与 Playwright API/UI 用例及 Prisma、lint、typecheck 的 L1/L2 运行态验证按计划延后到 QA，pnpm-lock.yaml 仍待 QA-001 统一刷新。
