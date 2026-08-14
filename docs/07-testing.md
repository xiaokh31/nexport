# 测试运行手册

状态：TEST-001 基础设施基线  
日期：2026-08-14

## 测试分层

- Vitest 单元测试：`tests/unit/**`，不连接数据库或外部网络。
- Vitest 集成测试：`tests/integration/**`，只连接受守卫保护的隔离 PostgreSQL。
- Playwright 浏览器测试：`tests/e2e/**`，通过测试数据库启动本地 Next.js。

测试替身位于 `tests/support/**`，fixtures 位于 `tests/fixtures/**`。生产源码只依赖 `src/lib/ports/external-services.ts` 中的端口契约，不得导入测试替身或 bypass。

## 数据库安全契约

破坏性测试脚本只接受同时满足以下条件的 `DATABASE_URL_TEST`：

1. 主机是 `127.0.0.1`、`localhost` 或 `::1`。
2. 数据库名以 `_test` 结尾，数据库用户名包含 `test`。
3. 显式使用非默认 PostgreSQL 端口，拒绝 `5432`。
4. URL 的 `application_name` 和 `TEST_DATABASE_MARKER` 均为 `nexport-test-only`。
5. fixture/清理过程还要求 `NODE_ENV=test`。

默认隔离地址为：

```dotenv
DATABASE_URL_TEST="postgresql://nexport_test:nexport_test_password@127.0.0.1:55432/nexport_test?schema=public&application_name=nexport-test-only"
TEST_DATABASE_MARKER="nexport-test-only"
```

独立的 `compose.test.yml` 使用 `nexport-test` Compose project、端口 `55432` 和 tmpfs 数据目录，不复用开发或生产卷。

## 命令

依赖安装和 lockfile 刷新由 QA-001 统一执行。安装完成后，首次运行 Playwright 前安装 Chromium：

```bash
pnpm exec playwright install chromium
```

局部命令：

```bash
pnpm test                 # 无数据库单元测试
pnpm test:db:up           # 启动隔离 PostgreSQL
pnpm test:integration     # 安全检查 → baseline → fixtures → 集成测试 → 清理
pnpm test:e2e             # 安全检查 → baseline → fixtures → 浏览器测试 → 清理
pnpm test:db:down         # 删除测试 compose 容器/临时卷
```

标准全流程命令：

```bash
pnpm test:all
```

该命令按固定顺序停止旧测试 project、启动空 PostgreSQL、生成 Prisma Client、仅部署 `0_init`、运行单元/集成/E2E 测试、清理业务表并关闭测试 project。即使测试失败，也会进入清理和关闭流程。

## Fixtures 与替身

角色 fixtures 覆盖 ADMIN、STAFF（有/无文章权限）、FINANCE、WAREHOUSE、CUSTOMER 和 PARTNER，共七个账户。账户使用保留的 `.test` 邮箱且 `password=null`，不提供默认生产密码，也未注册为 Prisma seed 或运行时初始化逻辑。

依赖注入替身包括：

- 可设置/推进的固定时钟。
- 可预测的随机字节与 quote reference 序列。
- 记录请求且不访问网络的 CAPTCHA verifier。
- 记录 recipient、不可变 payload 和稳定 idempotency key 的邮件 sender，可模拟成功、超时、HTTP 4xx 与 HTTP 5xx。

所有替身在 `NODE_ENV` 不是 `test` 时拒绝实例化；单元测试还会扫描 `src/**`，阻止生产代码导入 `tests/**`。
