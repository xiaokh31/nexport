# ZNB 本地开发与测试指南

状态：当前仓库可执行基线；`BRAND-001`、`VERCEL-001` 已完成，仍须由 `QA-004` 重跑全量与隔离平台验收
更新日期：2026-08-17

本指南是本地启动、自动化测试和发布前质量门禁的唯一操作入口。它不授权连接生产数据库、写入真实外部服务或执行生产部署。生产流程见 [`08-vercel-production-deployment.md`](08-vercel-production-deployment.md)。

## 1. 先明确三组不同的验证

| 目的 | 命令 | 数据库 | 是否包含其他组 |
|---|---|---|---|
| 快速单元测试 | `pnpm test` | 无 | 否 |
| 自动化全流程 | `pnpm test:all` | 脚本管理的隔离 PostgreSQL | 只包含 unit + integration + E2E |
| 发布质量门禁 | Prisma validate + lint + typecheck + `test:all` + build | 隔离测试库与已迁移本地开发库 | 需要逐项执行 |

`pnpm test:all` **不包含** lint、typecheck 或 `pnpm build`。不要把测试通过等同于完整发布门禁。

## 2. 前置条件

- Node.js `24.x`，以 `package.json#engines` 为准。
- pnpm `10.27.0`，以 `package.json#packageManager` 为准。
- Docker Desktop/Engine 已运行，`docker compose version` 可用。
- 本机端口 `55432` 可供隔离 PostgreSQL 使用；E2E 时端口 `3100` 可用。
- 约有足够空间安装依赖与 Playwright Chromium。

检查版本：

```bash
node --version
pnpm --version
docker compose version
```

如 pnpm 由 Corepack 管理，可先运行 `corepack enable`。首次检出后安装锁定依赖与 Chromium：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

只有在明确修改依赖并需要更新 `pnpm-lock.yaml` 时才运行不带 `--frozen-lockfile` 的 `pnpm install`。

## 3. 本地开发环境

### 3.1 创建本地配置

```bash
cp .env.example .env
```

`.env.example` 的 `.invalid` 地址和空 secret 故意不可使用。为普通页面开发至少配置一套本地 PostgreSQL、站点 URL 和互不复用的本地 secret，例如：

```dotenv
DATABASE_URL="postgresql://nexport:nexport_local_password@127.0.0.1:5432/nexport?schema=public"
DIRECT_URL="postgresql://nexport:nexport_local_password@127.0.0.1:5432/nexport?schema=public"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
SITE_INDEXING_ENABLED="false"
NEXTAUTH_SECRET="本地独立且至少32字节的值"
RATE_LIMIT_SECRET="另一个本地独立且至少32字节的值"
CRON_SECRET="第三个本地独立且至少32字节的值"
TRUSTED_PROXY_HOPS="0"
DATABASE_TARGET_ENVIRONMENT="development"
DATABASE_TARGET_ID="local-development"
DATABASE_PROVIDER="local-postgresql"
DATABASE_REGION="local"
DATABASE_ALLOWED_HOSTS="127.0.0.1"
DATABASE_BACKUP_ID="not-applicable-for-empty-local-development"
DATABASE_TARGET_CONFIRMATION="development:local-development"
```

不要把 `.env`、真实 provider key 或生产 URL 写入仓库。本地可以让池化/直连 URL 指向同一专用开发库；托管环境必须使用供应商各自的池化/直连 URL，并由受控命令验证同一目标。`NEXTAUTH_URL` 必须与该环境 `NEXT_PUBLIC_SITE_URL` 完全一致。

### 3.2 启动开发数据库

已有 PostgreSQL 时，创建专用空数据库和用户并更新 `.env`。也可以启动一个独立本地容器：

```bash
docker run --name nexport-postgres \
  -e POSTGRES_USER=nexport \
  -e POSTGRES_PASSWORD=nexport_local_password \
  -e POSTGRES_DB=nexport \
  -p 127.0.0.1:5432:5432 \
  -v nexport-postgres:/var/lib/postgresql/data \
  -d postgres:16-alpine
```

随后生成 Client、应用现有 baseline 并启动应用：

```bash
pnpm prisma:generate
pnpm migration:status
pnpm migration:deploy
pnpm dev
```

访问 <http://localhost:3000>，至少检查 `/`、`/solutions`、`/news`、`/login` 和 `/contact`。公开品牌应显示 `ZNB`，法定语境应显示 `ZNB Logistics Inc.`；客户表单中的通用“公司名称”不是品牌占位。

没有 reCAPTCHA 或 Resend 配置时应用可以启动，但注册、公开询价、验证邮件等受保护流程会按设计 fail closed；不能用伪 token、演示账户或临时 bypass 让它们通过。

## 4. 自动化测试数据库的硬性安全边界

破坏性测试脚本只接受同时满足以下全部条件的 `DATABASE_URL_TEST`：

1. 主机是 `127.0.0.1`、`localhost` 或 `::1`。
2. 数据库名以 `_test` 结尾，用户名包含 `test`。
3. 使用显式非默认 PostgreSQL 端口；端口 `5432` 会被拒绝。
4. URL 的 `application_name` 与 `TEST_DATABASE_MARKER` 都等于 `nexport-test-only`。
5. URL 含显式临时密码；fixtures/清理还要求 `NODE_ENV=test`。

默认值为：

```dotenv
DATABASE_URL_TEST="postgresql://nexport_test:nexport_test_password@127.0.0.1:55432/nexport_test?schema=public&application_name=nexport-test-only"
TEST_DATABASE_MARKER="nexport-test-only"
```

`compose.test.yml` 使用独立 `nexport-test` Compose project、端口 `55432` 和 tmpfs 数据目录，不复用开发卷。测试 runner 会把同一个安全 URL 注入 `DATABASE_URL` 与 `DIRECT_URL`，但不会读取或运行任何生产迁移目标元数据。`nexport-test-only` 是安全协议标识，不是公开品牌。

绝对禁止：

- 把生产或共享 staging URL 放入 `DATABASE_URL_TEST`。
- 放宽 `scripts/test/database-safety.mjs` 只为让某个 URL 通过。
- 在测试命令中注入生产 `DATABASE_URL`、生产 OAuth/CAPTCHA/Resend key。
- 在端口、数据库名或 marker 不明确时继续执行清理。

## 5. 常用测试流程

### 5.1 单元测试

```bash
pnpm test
```

`tests/unit/**` 不连接数据库或外部网络。定位单个文件时可运行：

```bash
pnpm exec vitest run tests/unit/<file>.test.ts --config vitest.config.ts
```

### 5.2 集成测试

```bash
pnpm test:db:up
pnpm test:integration
pnpm test:db:down
```

`test:integration` 会安全校验 URL、部署 `0_init`、加载 fixtures、运行 `tests/integration/**` 并清理数据，但**不会**替你启动或关闭数据库；即使中途失败，也要执行 `pnpm test:db:down`。

### 5.3 Playwright E2E

```bash
pnpm test:db:up
pnpm test:e2e
pnpm test:db:down
```

Playwright 使用 Chromium、单 worker，并自动启动 `pnpm dev --hostname 127.0.0.1 --port 3100`。它不会复用已有服务器；开始前停止占用 `3100` 的进程。HTML 报告写入 `playwright-report/`，失败时按配置保留截图/trace。

E2E 会清空 CAPTCHA 配置，用于验证“未配置时 UI 禁用、服务端拒绝”，不会向 Google、Resend 或其他真实服务发送请求。

### 5.4 一条命令运行全部自动化

```bash
pnpm test:all
```

脚本固定执行：关闭旧测试 project → 启动空 PostgreSQL → Prisma generate → 只部署 `0_init` → unit → integration → E2E → 清理 fixtures → 关闭并删除测试 project。成功或失败都进入 finally 清理；若主机或 Docker 异常中断，仍应人工补跑：

```bash
pnpm test:db:down
```

## 6. 完整发布质量门禁

先保证 `.env` 指向一套**已迁移的本地开发数据库**，不能指向生产。然后执行：

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:validate
pnpm lint
pnpm typecheck
pnpm test:all
pnpm build
```

需要记录每条命令的退出码、Node/pnpm 版本和测试计数。整套本地门禁中的 Prisma validate/受控 migration 需要同目标 `DIRECT_URL`；`pnpm build` 本身只使用可连接且已应用 baseline 的池化 `DATABASE_URL` 和一致的 `NEXT_PUBLIC_SITE_URL` / `NEXTAUTH_URL`。本地构建保持 `SITE_INDEXING_ENABLED=false`；普通 Preview 构建还应明确移除 `DIRECT_URL` 并证明仍能通过，不能为了构建成功注入迁移或生产凭据。

新增品牌/Vercel 任务的额外门禁：

- `BRAND-001`：公开 HTML、metadata、manifest、三语品牌上下文和邮件中，法定名/简称语义正确；客户“公司名称”字段与测试安全 marker 未误改。
- `VERCEL-001`：受保护 `GET` 与外部 scheduler 的 path/method/Bearer/频率契约一致，仓库未配置 Hobby 不支持的高频 Vercel Cron；受 Deployment Protection 的人工调用验证 Vercel bypass 与应用 Authorization 双 header；池化 `DATABASE_URL` / 直连 `DIRECT_URL` 边界和 Preview 隔离有自动化覆盖。
- `QA-004`：普通可信分支 Preview 只做受保护的页面/build/noindex smoke；完整认证/provider 验收在固定域、独立数据库的 staging 上执行。本地通过不能替代 staging 验收，但创建付费数据库、Vercel 项目、域名或 provider 必须由项目方 provision 或另行明确授权。

## 7. Fixtures、替身与人工外部服务测试

角色 fixtures 覆盖 ADMIN、STAFF（有/无文章权限）、FINANCE、WAREHOUSE、CUSTOMER 和 PARTNER，共七个账户。它们使用 `.test` 邮箱且 `password=null`，不是演示登录凭据，也不会由生产 seed 或运行时初始化。

测试替身提供固定时钟、可预测随机值、无网络 CAPTCHA verifier，以及可模拟成功/超时/4xx/5xx 的邮件 sender。替身在 `NODE_ENV != test` 时拒绝实例化，生产源码也不得导入 `tests/**`。

若要人工验证真实服务，使用专用 Development/Preview 项目和独立 key：

- reCAPTCHA 使用 provider 官方测试 key 或开发域 key，hostname 与本地/Preview origin 对齐。
- Resend 使用已验证的非生产发件域和不会触达真实客户的收件箱。
- Google OAuth 使用稳定 staging 域与独立 OAuth client；动态 Preview URL 不作为通用生产 callback。
- 测试结束撤销临时 key，不把 token、完整邮箱或数据库 URL复制到 issue/日志。

## 8. 故障排查

| 现象 | 检查与处理 |
|---|---|
| Docker 无法连接 | 启动 Docker；确认 `docker compose version` 和 `docker ps` 正常，再重跑 `test:db:up` |
| `55432` 被占用 | 找出并停止明确的占用者；不要把测试改到 5432；若自定义端口，仍须满足安全 guard 并同步 Compose/test env |
| 数据库安全 guard 拒绝 | 核对 localhost、`*_test`、test 用户、非 5432、密码、`application_name` 和 marker；不要绕过检查 |
| Prisma 提示表不存在 | 核对两个 URL、目标 allowlist 与备份/确认元数据，执行 `pnpm prisma:generate`、`pnpm migration:status` 和 `pnpm migration:deploy` |
| Chromium 不存在 | 执行 `pnpm exec playwright install chromium` |
| E2E 端口 3100 占用 | 停止明确的旧 dev/Playwright 进程后重跑；不要启用 `reuseExistingServer` 掩盖状态污染 |
| E2E 失败后残留容器 | 执行 `pnpm test:db:down`，确认只操作 `nexport-test` project 后再重跑 |
| build 访问 `.invalid` 或数据库失败 | 完成 `.env` 本地值并迁移本地开发库；不要改成生产 URL |
| 注册/询价按钮不可用 | 若 CAPTCHA 未配置，这是 fail-closed 预期；人工测试时配置独立开发 key，不加 bypass |
| 测试偶发相互污染 | 确认 Playwright `workers=1`、未复用服务器，并用 `pnpm test:all` 从空 tmpfs 数据库重跑 |

## 9. 测试完成检查表

- [ ] 所有命令在项目根目录执行，使用预期 Node/pnpm 版本。
- [ ] 自动化数据库满足五条 guard，且与开发/Preview/Production 完全隔离。
- [ ] unit、integration、E2E 零跳过；失败未通过修改安全边界或关闭规则规避。
- [ ] Prisma validate、lint、typecheck、build 分别通过。
- [ ] `pnpm test:db:down` 已执行，测试容器/网络已清理。
- [ ] 报告和日志不含 secret、密码、完整数据库 URL 或不必要的个人资料。
- [ ] 若任务涉及 Vercel，已按授权完成 QA-004 的普通 Preview 与固定 staging 证据；未把人工 handler 请求记录成外部 scheduler 自动运行证据。
- [ ] 未执行 Git 操作，未接触生产环境。
