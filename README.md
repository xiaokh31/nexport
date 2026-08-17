# ZNB 海外仓与跨境履约网站

这是一个面向海外仓储、订单履约、FBA 准备与交付及运输需求询价的企业网站。项目使用 Next.js App Router、React、TypeScript、Prisma、PostgreSQL、NextAuth、Tailwind CSS 和 Radix UI，包含公开站点、账户工作区、询价、通知、文章发布及按能力授权的管理后台。

> 公司法定/展示名称 `ZNB Logistics Inc.` 与网站简称 `ZNB` 已由 `BRAND-001` 接入公开品牌语境。正式域名、联系方式、Logo、法律文本和可公开业务事实仍待确认。在完成 `VERCEL-001`、`QA-004`，通过生产变更授权门（Go/No-Go），并在 `RELEASE-001` 内通过“解除保护/公开门”前，不得把当前版本作为正式企业网站发布。

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

自动化测试全流程执行 `pnpm test:all`。它会重建空测试库、只部署 `0_init`、加载受控 fixtures、依次运行单元/集成/E2E，并在成功或失败后清理和关闭测试 project。它**不包含** lint、typecheck 或生产构建；发布门禁还必须单独执行这些检查。完整步骤见 [`docs/07-testing.md`](docs/07-testing.md)。

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

当前邮件调度器接口要求定期向 `POST /api/cron/email-outbox?limit=25` 发送 `Authorization: Bearer <CRON_SECRET>`。`limit` 范围为 1～100。目标部署使用 Vercel Hobby，其原生 Cron 最多每天一次，不能承担注册验证与报价邮件的及时处理；`VERCEL-001` 只实现共享 handler、受保护 `GET` 和外部调度契约，生产 provider 在生产变更授权门选定，并由 `RELEASE-001` 创建为默认每 5 分钟调用。生产环境还应监控 worker 的 401/503/500、重试积压、`FAILED` 和 `MANUAL_REVIEW` 记录；不要把 secret 放在 URL 或日志中。

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

## Vercel 生产部署

目标平台与套餐已确定为 Vercel Hobby。项目的 Next.js/Node 架构可以按 Hobby 技术限制部署，但当前仓库还不是可直接上线的发布包：Prisma 尚未区分池化运行时连接与迁移直连，邮件 worker 只有 `POST`，外部调度器也尚未选定或配置。

> Vercel 当前官方条款把 Hobby 限定为个人、非商业用途。本文档按项目方指定的 Hobby 技术方案制定，但在正式企业网站公开前，项目方仍须确认该用途获得 Vercel 允许；若不符合，需改用获准套餐或其他合规托管方案。这个条款确认不改变应用任务顺序。

- `BRAND-001` 已完成；开发 Agent 接下来按 [`docs/05-agent-backlog.md`](docs/05-agent-backlog.md) 串行执行 `VERCEL-001 → QA-004`。
- 运维人员再按 [`docs/08-vercel-production-deployment.md`](docs/08-vercel-production-deployment.md) 通过生产变更授权门（Go/No-Go）并执行 `RELEASE-001`；该任务内还设有独立的“解除保护/公开门”。
- 任何 Preview、自动化测试或迁移都不得连接生产客户数据库。
- 数据库迁移是独立受控步骤，不进入 Vercel 的普通 install/build 命令；应用回滚也不会自动回滚数据库。

## 上线前公司资料清单

以下事项目前仍是发布阻塞项，必须由项目使用方提供和审核：

- [x] 公司法定/展示名称确认为 `ZNB Logistics Inc.`，网站简称确认为 `ZNB`。
- [x] 执行 `BRAND-001`，把已确认名称接入统一配置、公开页面、metadata、manifest、三语品牌上下文和法律页 fallback；客户表单中的通用“公司名称”字段保持不变。
- [ ] 确认 Logo、favicon、OG 图、正式域名和最终品牌资产。
- [ ] 在 `src/config/site-config.ts` 更新已确认的邮箱、电话和地址；占位联系方式必须继续隐藏。
- [x] 在 `src/app/layout.tsx` 更新 title、description、author/publisher、Open Graph 和 Twitter 文案；有经过授权的 OG 图后再增加引用。
- [x] 使用消费统一站点配置的 `src/app/manifest.ts` 生成 manifest 名称、简称、描述和主题色，不保留静态双写。
- [x] 检查三份 `src/i18n/locales/*.json`、`src/app/about/page.tsx` 中的品牌语境并移除未证实主张；保留客户填写公司名称的通用字段语义。
- [ ] 由业务负责人确认八类公开解决方案的范围、地区、限制和询价资料要求，不添加未经证实的价格、时效、仓库面积、客户数或订单量。
- [ ] 由法律/隐私负责人审核并在后台发布 `privacy` 与 `terms` 页面；当前源码 fallback 只是占位文本，不能直接上线。
- [ ] 确认可公开的联系渠道、营业时间、公司历史、仓库资料和授权图片；未确认的模块保持隐藏。
- [ ] 不把承运商、平台或其他品牌展示为合作伙伴，除非已取得可证明的授权。
- [ ] 验证发件域名、Google OAuth、reCAPTCHA、搜索引擎所有权和生产调度器。
- [ ] 在后台“系统设置”填写六个已确认字段。注意：这些数据库设置当前不会覆盖公开 shell 的构建时静态配置，仍需同步更新上述源码并重新构建。
- [x] 完成原始 QA-001～003，并记录本地 Node/pnpm/PostgreSQL 与自动化结果。
- [ ] 完成 `VERCEL-001` 与 `QA-004`，确认 Vercel Hobby、托管 PostgreSQL、Preview 隔离、外部邮件调度器、备份和回滚契约。
- [ ] 获得明确生产发布授权后执行 `RELEASE-001`，记录生产迁移、部署、管理员初始化和回滚负责人。

## 文档与许可证

- [`docs/README.md`](docs/README.md)：设计、执行计划和任务导航
- [`docs/06-task-progress.md`](docs/06-task-progress.md)：实时任务完成度
- [`docs/07-testing.md`](docs/07-testing.md)：本地开发、隔离数据库与完整测试指南
- [`docs/08-vercel-production-deployment.md`](docs/08-vercel-production-deployment.md)：Vercel 生产部署、验收与回滚指南

本项目使用 [GNU Affero General Public License v3.0](LICENSE)。通过网络向用户提供修改后的程序时，AGPL-3.0 通常涉及向这些用户提供对应源码的义务。具体适用范围、源码提供方式、第三方代码和部署流程必须由项目使用方自行进行法律与合规审核；本说明不是法律意见，也没有修改 `LICENSE` 正文。
