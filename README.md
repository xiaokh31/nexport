# Nexport 海外仓与跨境履约网站

这是一个面向海外仓储、订单履约、FBA 准备与交付及运输需求询价的企业网站。项目使用 Next.js App Router、React、TypeScript、Prisma、PostgreSQL、NextAuth、Tailwind CSS 和 Radix UI，包含公开站点、账户工作区、询价、通知、文章发布及按能力授权的管理后台。

> 当前仓库仍使用 `Company Name`、示例联系方式和中性内容。它们不是已确认的公司事实；完成“上线前公司资料清单”之前不得部署为正式企业网站。

## 快速开始：从空数据库启动

### 1. 准备环境

- Node.js `>=20.9.0`
- pnpm `10.27.0`，版本以 `package.json#packageManager` 为准
- PostgreSQL 16；也可以使用 Docker 启动本地 PostgreSQL
- 运行集成测试或 E2E 时需要 Docker Compose v2

如本机使用 Corepack，可执行 `corepack enable` 后确认版本：

```bash
node --version
pnpm --version
```

### 2. 安装依赖并创建本地环境文件

```bash
pnpm install
cp .env.example .env
```

`.env.example` 中的 `.invalid` 地址和空 secret 故意不可用。至少把以下值改为本地值：

```dotenv
DATABASE_URL="postgresql://nexport:nexport_local_password@127.0.0.1:5432/nexport?schema=public"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET="使用 openssl rand -hex 32 生成的独立值"
RATE_LIMIT_SECRET="使用 openssl rand -hex 32 生成的另一个独立值"
CRON_SECRET="使用 openssl rand -hex 32 生成的第三个独立值"
TRUSTED_PROXY_HOPS="0"
```

不要在多个 secret 之间复用同一个值，也不要提交 `.env`。没有 CAPTCHA 或邮件配置时，应用仍可启动，但注册、询价和验证邮件等受保护流程会按设计 fail closed。

本地首次安装使用 `pnpm install`；提交锁文件更新后，CI 和部署必须使用 `pnpm install --frozen-lockfile`。

### 3. 启动一个空 PostgreSQL

如果已有 PostgreSQL，请创建空数据库和专用用户，并让 `DATABASE_URL` 指向它。使用 Docker 时可以运行：

```bash
docker run --name nexport-postgres \
  -e POSTGRES_USER=nexport \
  -e POSTGRES_PASSWORD=nexport_local_password \
  -e POSTGRES_DB=nexport \
  -p 127.0.0.1:5432:5432 \
  -v nexport-postgres:/var/lib/postgresql/data \
  -d postgres:16-alpine
```

后续可用 `docker stop nexport-postgres` 和 `docker start nexport-postgres` 停止或恢复该本地数据库。

### 4. 生成 Prisma Client 并部署 baseline

```bash
pnpm prisma:generate
pnpm exec prisma migrate deploy
```

仓库当前只有 `prisma/migrations/0_init/migration.sql` 这一条 baseline。它能够直接部署到空 PostgreSQL，不需要 seed、演示账户或手工建表。

### 5. 启动开发服务器

```bash
pnpm dev
```

打开 <http://localhost:3000>。健康检查建议至少访问：首页、`/solutions`、`/news`、`/login` 和 `/contact`。应用不会自动创建管理员、测试用户或业务数据。

## 环境变量

以 [`.env.example`](.env.example) 为唯一清单；运行时读取集中在 `src/config/env/**`，测试数据库守卫位于 `scripts/test/database-safety.mjs`。

| 变量 | 要求 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 启动、迁移和生产必填 | PostgreSQL 连接串；不要指向测试或共享错误环境 |
| `NEXT_PUBLIC_SITE_URL` | 构建和运行必填 | 站点 origin；不能带路径、查询、凭据或 fragment，生产必须使用 HTTPS |
| `NEXTAUTH_SECRET` | 启用认证必填，至少 32 bytes | NextAuth 会话及邮箱验证签名 |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | 可选，但必须同时设置 | 启用 Google OAuth |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | 启用注册和公开询价必填 | 浏览器组件和服务端 reCAPTCHA 校验；hostname 必须匹配站点 origin |
| `RATE_LIMIT_SECRET` | 注册、登录和询价必填，至少 32 bytes | 对限流键进行 HMAC；原始 IP 和邮箱不落库 |
| `TRUSTED_PROXY_HOPS` | 默认 `0` | 可信反向代理跳数；必须是非负整数并与真实拓扑完全一致 |
| `RESEND_API_KEY` / `EMAIL_FROM` | 启用邮件 worker 必填 | 发送验证邮件和通知；`EMAIL_FROM` 应使用已验证发件域名 |
| `CRON_SECRET` | 启用邮件 worker 必填，至少 32 bytes | 保护邮件 outbox worker 的 Bearer 请求 |
| `*_SITE_VERIFICATION` | 可选 | Google、Bing、Baidu 和 Yandex 站点所有权验证 |
| `DATABASE_URL_TEST` 等测试变量 | 仅测试 | 详见“测试与质量门禁”；禁止复用生产数据库 |

环境变量变更后重启开发服务器。`NEXT_PUBLIC_*` 值会进入浏览器构建，不能存放 secret。

## Prisma 与数据库变更

| 目的 | 命令 |
| --- | --- |
| 生成 Prisma Client | `pnpm prisma:generate` |
| 校验 schema | `pnpm prisma:validate` |
| 向空库或部署环境应用已有迁移 | `pnpm exec prisma migrate deploy` |
| 为明确的 schema 变更创建开发迁移 | `pnpm exec prisma migrate dev --name <change-name>` |
| 本地查看数据 | `pnpm prisma:studio` |

- `pnpm db:push` 只用于明确的一次性本地实验，不能代替受版本控制的迁移。
- `pnpm start` 不会自动迁移数据库；部署流程必须先单独执行 `prisma migrate deploy`。
- `scripts/test/**` 具有破坏性清理能力，但只接受受守卫保护的本地 `_test` 数据库。不要给这些命令注入生产 `DATABASE_URL`。
- 正式迁移前先备份数据库，并在与生产同版本的 PostgreSQL 上验证恢复路径。

## 测试与质量门禁

常用静态门禁：

```bash
pnpm prisma:generate
pnpm prisma:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

集成测试和 E2E 使用 `compose.test.yml` 中独立的 `nexport-test` project、端口 `55432` 和 tmpfs 数据目录：

```bash
pnpm exec playwright install chromium
pnpm test:db:up
pnpm test:integration
pnpm test:e2e
pnpm test:db:down
```

完整门禁执行 `pnpm test:all`。它会重建空测试库、只部署 `0_init`、加载受控 fixtures、依次运行单元/集成/E2E，并在成功或失败后清理和关闭测试 project。详细安全契约见 [`docs/07-testing.md`](docs/07-testing.md)。

## 初始化第一个管理员

仓库没有默认密码、管理员 seed 或隐藏的演示登录。管理员必须来自一个已经存在且完成邮箱验证的真实账户：

1. 配置 CAPTCHA、限流、Resend、`EMAIL_FROM`、`CRON_SECRET` 和 `NEXTAUTH_SECRET`。
2. 在 `/register` 注册账户。
3. 由调度器触发邮件 worker，用户通过邮件链接完成验证。
4. 在目标环境的 `DATABASE_URL` 下运行：

```bash
pnpm admin:promote --email administrator@example.com
```

命令幂等，只提升已验证账户，不创建用户或密码。每个环境分别执行一次。系统拒绝删除或降级最后一个 `ADMIN`，也拒绝管理员删除自己的账户。

邮件调度器应定期向 `POST /api/cron/email-outbox?limit=25` 发送 `Authorization: Bearer <CRON_SECRET>`。`limit` 范围为 1～100。生产环境应监控 worker 的 401/503/500、重试积压、`FAILED` 和 `MANUAL_REVIEW` 记录；不要把 secret 放在 URL 或日志中。

## 服务类型契约

`src/config/quote.ts`、Prisma `ServiceType` enum、询价表单和 API 必须保持一致。九个合法值如下：

| `serviceType` | 当前公开含义 | 公开详情页 |
| --- | --- | --- |
| `FBA_LAST_MILE` | FBA 预约与尾程交付 | `/solutions/fba-last-mile` |
| `TRUCK_FREIGHT` | 卡车运输需求 | `/solutions/truck-freight` |
| `CROSS_BORDER` | 跨境运输衔接 | `/solutions/cross-border` |
| `AMAZON_FBA` | FBA 入仓前准备 | `/solutions/amazon-fba` |
| `EXPRESS` | 加急运输需求 | `/solutions/express` |
| `WAREHOUSE` | 海外仓储作业 | `/solutions/warehouse` |
| `DROPSHIPPING` | 一件代发履约 | `/solutions/dropshipping` |
| `RETURNS` | 退货与换标作业 | `/solutions/returns` |
| `OTHER` | 其他询价，仅表单兜底 | 无 |

不要自行合并 FBA 准备与尾程交付，也不要把 `WAREHOUSE` 描述成 WMS 软件。修改枚举必须同时提供 Prisma 迁移，并更新 `src/config/site-config.ts`、三语内容、校验、API 和覆盖全部九个值的测试。

## 后台 capability matrix

API 和 UI 共享 `src/lib/permissions.ts` 中的唯一能力矩阵。`✓` 表示固定允许，`条件` 表示仅 `STAFF.canManageArticles=true` 时允许。

| Capability | ADMIN | STAFF | FINANCE | WAREHOUSE | CUSTOMER | PARTNER |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| `admin.overview` | ✓ | — | — | — | — | — |
| `quotes.read` | ✓ | ✓ | ✓ | — | — | — |
| `quotes.update` | ✓ | ✓ | ✓ | — | — | — |
| `quotes.delete` | ✓ | — | — | — | — | — |
| `articles.manage` | ✓ | 条件 | — | — | — | — |
| `pages.manage` | ✓ | — | — | — | — | — |
| `users.manage` | ✓ | — | — | — | — | — |
| `notifications.broadcast` | ✓ | — | — | — | — | — |
| `settings.manage` | ✓ | — | — | — | — | — |

这个矩阵只描述后台能力；`CUSTOMER`、`PARTNER` 等已登录用户仍可访问自己的资料、通知和本人询价。`canManageArticles` 对非 `STAFF` 会被重置为 `false`。权限判断必须在服务端重新读取当前用户，不得只依赖客户端菜单隐藏或旧 session 声明。

## 文章发布与维护

- 只有具有 `articles.manage` 的账户可以创建、修改、归档或删除文章。
- `DRAFT` 不进入公开新闻、相关文章或 sitemap；`PUBLISHED` 同时要求 `publishedAt` 非空；`ARCHIVED` 会从公开查询中消失。
- 第一次发布写入 `publishedAt`。归档和重新发布不会改写首次发布时间。
- slug 会规范化并保持唯一；文章首次发布后 slug 永久锁定，避免公开 URL 漂移。
- 发布或归档会重新验证首页、新闻列表、文章详情、sitemap、解决方案页和后台预览缓存。
- 内容只接受安全 Markdown。站内图片必须使用以 `/` 开头的同站绝对路径，且封面图需要有真实文件和有意义的替代文本。
- 解决方案页会把 `category="service"` 或 tags 匹配的文章作为相关内容；tag 可使用 solution key、slug、`ServiceType` 或其小写形式。
- 删除为永久删除。操作前确认内容和 URL 不再需要，并保留必要的外部备份。

## 部署注意事项

推荐顺序：

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm prisma:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm exec prisma migrate deploy
pnpm build
pnpm start
```

- 构建和运行环境都需要有效的 `NEXT_PUBLIC_SITE_URL`；生产值必须是 HTTPS origin。
- 构建使用的 `DATABASE_URL` 必须指向预期环境。迁移使用单独、最小权限的部署凭据更安全。
- Google OAuth 的回调地址是 `<site-origin>/api/auth/callback/google`；OAuth 控制台、站点 origin 和部署域名必须一致。
- reCAPTCHA 允许域名必须与 `NEXT_PUBLIC_SITE_URL` hostname 一致。缺少密钥时注册和询价不会自动放行。
- `TRUSTED_PROXY_HOPS` 只能根据真实代理链设置；错误值可能导致限流身份混淆。直连或不确定时保持 `0`。
- 为 PostgreSQL 配置备份、恢复演练、连接加密和最小权限；为应用、worker 和数据库日志设置脱敏与保留策略。
- 发布后检查 `/robots.txt`、`/sitemap.xml`、OAuth、邮件验证、询价、用户数据隔离和管理权限。

## 上线前公司资料清单

以下事项目前仍是发布阻塞项，必须由项目使用方提供和审核：

- [ ] 确认公司法定/展示名称、Logo、favicon、品牌色和正式域名。
- [ ] 在 `src/config/site-config.ts` 更新站点名称、邮箱、电话和地址。
- [ ] 在 `src/app/layout.tsx` 更新 title、description、author/publisher、Open Graph 和 Twitter 文案；有经过授权的 OG 图后再增加引用。
- [ ] 在 `public/manifest.json` 更新名称、简称、描述和主题色。
- [ ] 检查三份 `src/i18n/locales/*.json`、`src/app/about/page.tsx` 中的 `Company Name` 和公司介绍。
- [ ] 由业务负责人确认八类公开解决方案的范围、地区、限制和询价资料要求，不添加未经证实的价格、时效、仓库面积、客户数或订单量。
- [ ] 由法律/隐私负责人审核并在后台发布 `privacy` 与 `terms` 页面；当前源码 fallback 只是占位文本，不能直接上线。
- [ ] 确认可公开的联系渠道、营业时间、公司历史、仓库资料和授权图片；未确认的模块保持隐藏。
- [ ] 不把承运商、平台或其他品牌展示为合作伙伴，除非已取得可证明的授权。
- [ ] 验证发件域名、Google OAuth、reCAPTCHA、搜索引擎所有权和生产调度器。
- [ ] 在后台“系统设置”填写六个已确认字段。注意：这些数据库设置当前不会覆盖公开 shell 的构建时静态配置，仍需同步更新上述源码并重新构建。
- [ ] 完成 QA-001～003，并记录实际 Node/pnpm/PostgreSQL 版本、迁移结果和回滚负责人。

## 文档与许可证

- [`docs/README.md`](docs/README.md)：设计、执行计划和任务导航
- [`docs/06-task-progress.md`](docs/06-task-progress.md)：实时任务完成度
- [`docs/07-testing.md`](docs/07-testing.md)：隔离数据库与自动化测试手册

本项目使用 [GNU Affero General Public License v3.0](LICENSE)。通过网络向用户提供修改后的程序时，AGPL-3.0 通常涉及向这些用户提供对应源码的义务。具体适用范围、源码提供方式、第三方代码和部署流程必须由项目使用方自行进行法律与合规审核；本说明不是法律意见，也没有修改 `LICENSE` 正文。
