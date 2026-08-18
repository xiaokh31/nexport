# ZNB Vercel Hobby 生产部署指南

状态：`BRAND-001`、`VERCEL-001` 已完成；首次生产发布前仍须完成 `QA-004` 并获得 `RELEASE-001` 明确授权
更新日期：2026-08-17  
适用项目：`ZNB Logistics Inc.` 企业官网（网站简称 `ZNB`）

## 1. 结论与当前边界

项目的 Next.js App Router、Node runtime、Prisma/PostgreSQL 和 NextAuth 架构已经具备 Vercel 代码与运维契约，但目前**不能直接视为生产就绪**，因为：

- `BRAND-001` 已把 `ZNB Logistics Inc.` / `ZNB` 接入公开品牌；正式域名、Logo、联系方式和法律文本仍待确认。
- Prisma 已由 `DATABASE_URL` 提供池化运行时连接，并由 `DIRECT_URL` 提供受控 migration/admin 直连；迁移 runner 会在执行前验证目标并显示脱敏摘要。
- `/api/cron/email-outbox` 已通过共享 handler 导出受 Bearer 保护的 `GET` 与人工兼容 `POST`；外部 scheduler 的生产 provider 尚未选择或创建。
- 只有 Vercel Production 且 `SITE_INDEXING_ENABLED=true` 才允许索引；其他环境由 metadata、`X-Robots-Tag`、robots 和 sitemap 四层 fail-safe 禁止索引，但仍必须启用 Deployment Protection 才构成访问控制。
- 正式域名、公开联系方式、Logo/OG、法律文本、托管 PostgreSQL 供应商/区域和生产外部服务尚未确认。

项目方已明确选择 **Vercel Hobby**，本文按 Hobby 的技术限制制定部署方案。但截至本指南日期，Vercel 的 [Hobby 说明](https://vercel.com/docs/plans/hobby)与[公平使用指南](https://vercel.com/docs/limits/fair-use-guidelines)仍限定为个人、非商业使用；ZNB 企业展示、获客和询价是否符合使用资格，必须在公开上线前由项目方确认或取得 Vercel 允许。本文不会把“技术可部署”误写为“使用条款已满足”。

[Hobby Cron 最多每天一次且只有小时级精度](https://vercel.com/docs/cron-jobs/usage-and-pricing)，不能满足注册验证邮件和报价通知的时效。本方案不使用 Vercel Cron 作为邮件主链路，而是由独立外部调度器每 5 分钟调用受保护 worker；Hobby 原生 Cron 最多作为可选的每日恢复扫描。

## 2. 发布责任与任务顺序

```text
BRAND-001
    ↓
VERCEL-001
    ↓
QA-004（本地全门禁 + 托管 staging + 隔离 Preview）
    ↓
人工生产变更授权门（Go/No-Go）
    ↓
RELEASE-001（生产迁移 → 部署 → 域名 → smoke → 运维移交）
```

- 开发 Agent 可处理前三项的代码和本地验证。QA-004 需要的托管数据库、固定 staging、域名或 provider 必须由项目方预先 provision，或另行明确授权并确认费用与清理负责人。
- 创建付费外部资源、创建/修改 Vercel 项目、写入平台环境变量、DNS、数据库、管理员或真实 provider 都是外部写操作；任务卡本身不构成授权。Production 行为只能在 `RELEASE-001` 获得明确授权后执行。
- 本指南中的 provider 名称和 URL 结构是选择依据，不是已完成配置；实际值必须由上线负责人记录。

## 3. 目标生产架构

| 层 | 目标 | 关键约束 |
|---|---|---|
| Web/Server | Vercel Hobby，Next.js Node runtime | Node `24.x`；关注免费额度和最长函数执行限制；函数区与数据库尽量共区 |
| 固定 Staging | 固定 branch 的 Vercel Preview deployment + 固定域 | 不是 Production；独立数据库/provider、Deployment Protection、强制 noindex；只供完整 QA，不注册 Vercel Cron |
| 静态内容 | Vercel CDN | canonical 只指正式域名，避免 `.vercel.app` 重复内容 |
| 数据库 | 外部托管 PostgreSQL | runtime 使用池化 URL；migration 使用直连 URL；自动备份与恢复演练 |
| 认证 | NextAuth + Credentials，可选 Google OAuth | 每环境独立 secret；稳定 callback；无演示账户 |
| CAPTCHA | reCAPTCHA v2 当前实现 | site/secret 成对，hostname 严格匹配，缺配置 fail closed |
| 邮件 | Resend + PostgreSQL transactional outbox | 已验证发件域；稳定幂等键；外部 scheduler 小批量处理 |
| 调度 | 外部 HTTPS scheduler | 生产 `GET` + Bearer `CRON_SECRET`；默认每 5 分钟；Hobby Cron 不承担邮件及时性 |
| 监控 | Vercel Build/Runtime Logs + 外部 scheduler + 数据库/Resend 监控 | Hobby 日志保留有限；日志脱敏；积压、失败、授权错误告警 |

[Vercel 已停止提供旧的 Vercel Postgres 产品](https://vercel.com/docs/postgres)；新项目应从 [Marketplace Storage](https://vercel.com/docs/marketplace-storage) 选择 Prisma Postgres、Neon、Supabase 或其他合适的 PostgreSQL 服务。不要仅因示例选择供应商，须比较加拿大数据驻留、区域、备份、连接池、恢复目标、费用和支持。

## 4. 首次发布前必须确认的外部事项

### 4.1 公司与内容

- [ ] 正式域名及 canonical host（apex 或 `www` 二选一）。
- [ ] 可公开邮箱、电话、地址、营业时间和服务范围。
- [ ] 公司审核后的 About、隐私政策和服务条款。
- [ ] 有授权的 Logo、favicon、OG 图、仓库图片和业务声明。
- [ ] 未提供的模块确认继续隐藏，不以占位或推测补齐。

### 4.2 账户、基础设施与责任人

- [ ] Vercel Hobby 项目所有者、账户恢复方式、额度监控负责人，以及 Hobby 使用资格/与 Vercel 沟通负责人。
- [ ] PostgreSQL 供应商、Production/staging 数据库、区域、连接上限、备份保留、PITR、目标 RPO/RTO 和恢复负责人。
- [ ] DNS 权限、Resend、Google OAuth、reCAPTCHA、外部调度器和搜索站长平台的生产所有者。
- [ ] migration 执行人、部署人、回滚决策人、值班/告警接收人。
- [ ] AGPL-3.0 对应源码提供机制及第三方许可、隐私和日志保留审核；准备与实际 deployment/revision 一一对应的源码 URL/归档，包含构建/安装脚本和适用 notices，并定义未登录用户如何取得。本项须由项目方确认，本指南不是法律意见。

## 5. Vercel 项目配置

代码已由 `package.json` 和 `vercel.json` 固定关键版本与命令。获得相应外部写授权后，在 Vercel Dashboard 创建/连接项目并核对：

| 设置 | 值 |
|---|---|
| Framework Preset | Next.js |
| Root Directory | 仓库根目录 `.` |
| Node.js Version | `24.x` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | 留空，使用 Next.js 默认 |
| Development Command | `pnpm dev` |
| Production Branch | 由团队发布流程指定，不在本指南猜测 |
| Function Region | 与选定 PostgreSQL 区域和数据驻留要求核对后设置 |
| Deployment Protection | 普通 Preview 与固定 staging 启用；Production 公开域按业务要求开放 |

保留 `packageManager: pnpm@10.27.0`。Vercel 会依据 lockfile 和 package 配置选择 pnpm；如构建日志未使用锁定版本，再按官方建议评估 `ENABLE_EXPERIMENTAL_COREPACK=1`，而不是直接忽略版本漂移。[Vercel 构建设置](https://vercel.com/docs/builds/configure-a-build)、[pnpm 10 支持说明](https://vercel.com/changelog/automatic-pnpm-v10-support)

构建命令不得包含 `prisma migrate deploy` 或 `prisma db push`。Next.js 构建会查询公开文章/页面，故目标数据库必须在构建前可连接且 schema 已迁移；这也是 migration 必须先于生产部署、又不能由每个 Preview 自动执行的原因。

Preview 模型固定为两类，不使用含糊的“任意 Preview 都能测全部功能”：

- 普通可信分支 Preview：只做受 Deployment Protection 保护的页面/构建 smoke；不配置 OAuth、CAPTCHA、Resend 或 Cron secret。来自 fork 或不可信代码的构建不获得数据库/provider secret，也不自动进入持有 secret 的 Vercel 项目。
- 固定 staging：使用固定 branch 的 Vercel **Preview deployment**、固定域、独立数据库和独立 provider 凭据，供完整认证/询价/邮件/RBAC QA。它不得部署成 Vercel Production environment，因此不会注册 `vercel.json` Cron；创建这套外部资源必须另有授权，并由应用级开关强制 noindex。

Hobby 可使用 Vercel Authentication 保护部署，但官方当前限制每个 Hobby 账户最多一个外部用户；QA 参与人和自动化 bypass 必须在创建 staging 前确认。[Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)

Hobby 额度用尽时项目可能暂停，函数最长执行时间也低于 Pro。上线负责人必须监控 Usage；outbox 保持小批量、单次执行明确低于配置的函数上限，积压时增加调度次数而不是让一次函数无限运行。[Vercel Hobby 额度](https://vercel.com/docs/plans/hobby)

## 6. PostgreSQL 与 Prisma 连接契约

### 6.1 两类 URL

| 变量 | 用途 | 可用位置 | 禁止事项 |
|---|---|---|---|
| `DATABASE_URL` | Vercel build/runtime 的池化连接 | 对应环境的应用构建与函数 | 不跨 Production/Preview；不用于破坏性测试 |
| `DIRECT_URL` | Prisma migration/admin 的直连连接 | 受控 CI/release runner 的 secret store | 不进浏览器；不提供给普通 Preview；尽量不暴露给应用 runtime |

Prisma 官方建议 serverless runtime 使用池化连接，并为 migration/管理使用直连 URL；具体参数以供应商生成的连接串为准。[Prisma 数据库连接](https://www.prisma.io/docs/postgres/database/connecting-to-your-database)、[Prisma 连接池](https://www.prisma.io/docs/postgres/database/connection-pooling)

`prisma/schema.prisma` 已设置 `directUrl = env("DIRECT_URL")`；`.env.example`、受控 runner 和边界测试使用同一契约。应用 build/runtime 仍只把 `DATABASE_URL` 当作常规数据源，普通 Preview 不获得 `DIRECT_URL`。

Prisma CLI 会解析同一 datasource；migration runner 必须**同时**获得同一个目标环境的池化 `DATABASE_URL` 和直连 `DIRECT_URL`。只注入 `DIRECT_URL` 不是可执行流程。受控 preflight 还必须验证两者指向同一供应商/项目/数据库，只输出脱敏的 provider、host、port、database、user、region 摘要，不输出密码或 query credential。

### 6.2 环境隔离

- Production：独立数据库、用户、池化 URL、migration secret 和备份。
- 固定 staging：独立非生产数据库；可使用数据库分支或共享 staging，但绝不能复制或读取真实客户数据。
- 普通 Preview：只供可信分支；使用最小权限、无客户数据的 Preview/build 数据源。来自 fork 或不可信代码的构建不获得任何数据库 secret。
- Development：开发者专用本地/开发数据库。
- Automated test：只使用 [`07-testing.md`](07-testing.md) 规定的 localhost `_test` 数据库和安全 marker。

Vercel 环境变量按 [Production、Preview、Development 作用域](https://vercel.com/docs/environment-variables) 分配。Preview 若使用共享数据库，测试必须串行并可清理；更优方案是每个 Preview 建数据库分支。任何 Preview 都不应获得生产 `DIRECT_URL`。

### 6.3 Migration 规则

- 生产只通过 `pnpm migration:deploy` 调用 Prisma deploy，不用 `migrate dev` 或 `db push`。
- migration 由受控 CI/release runner 在构建前执行；同时注入同环境的 `DATABASE_URL` 与 `DIRECT_URL`，凭据来自 secret store，不把完整 URL 写入命令历史、文档或日志。
- runner 还要求 `DATABASE_TARGET_ENVIRONMENT`、`DATABASE_TARGET_ID`、`DATABASE_PROVIDER`、`DATABASE_REGION`、精确 host 列表 `DATABASE_ALLOWED_HOSTS`、`DATABASE_BACKUP_ID` 和精确的 `DATABASE_TARGET_CONFIRMATION=<environment>:<target-id>`。
- 执行人先运行 `pnpm migration:status` 核对脱敏目标摘要和迁移状态；Production deploy 由第二人复核后设置 `PRODUCTION_CHANGE_CONFIRMATION=DEPLOY <target-id> TO PRODUCTION`，再运行 `pnpm migration:deploy`。runner 会先再次执行 status，然后才 deploy。
- schema 变更采用 expand/contract：先部署向后兼容新增，再切代码，确认旧版本不再使用后另一次发布移除。
- 每次迁移前确认自动备份/PITR 可用，并在隔离恢复库留存满足目标 RPO/RTO 的恢复证据；Vercel 应用回滚不等于数据库回滚。

Prisma 的生产命令说明见 [Prisma Migrate 部署指南](https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)。

## 7. 环境变量矩阵

所有 secret 按环境独立生成，不复用。`NEXT_PUBLIC_*` 会进入浏览器构建，绝不能包含 secret，修改后必须重新部署。当前发布模型明确区分“固定 staging”和“普通可信分支 Preview”；普通 Preview 不承担认证/provider 验收。

| 变量 | Production | 固定 staging | 普通可信分支 Preview | 说明 |
|---|---|---|---|---|
| `DATABASE_URL` | 生产池化 URL | staging 池化 URL | 最小权限、无客户数据的 Preview/build URL | build/runtime 必需；不可信代码不部署或不给 URL |
| `DIRECT_URL` | 仅生产 release runner | 仅 staging migration runner | 不提供 | CLI 同时还要获得同环境 `DATABASE_URL` |
| `NEXT_PUBLIC_SITE_URL` | `https://<canonical-domain>` | 固定 staging origin | 固定 staging origin | 必须是 origin；普通 Preview 只做 noindex 页面 smoke |
| `NEXTAUTH_URL` | 与 canonical 完全一致 | 固定 staging origin | 不承担登录；若运行认证依赖则仍使用 staging origin | 不采用未设计的动态 callback |
| `NEXTAUTH_SECRET` | 独立，至少 32 bytes | 独立，至少 32 bytes | 若构建/runtime 必需则用第三个低权限值 | 不跨环境复用 |
| `SITE_INDEXING_ENABLED` | 仅审核后设为 `true` | `false` | `false` | VERCEL-001 新增；缺失必须按 false |
| `DATABASE_TARGET_*` / `DATABASE_PROVIDER` / `DATABASE_REGION` / `DATABASE_ALLOWED_HOSTS` / `DATABASE_BACKUP_ID` | 仅生产 release runner | 仅 staging migration/admin runner | 不提供 | 目标 allowlist、备份和确认元数据；不含连接密码 |
| `PRODUCTION_CHANGE_CONFIRMATION` | 仅生产变更窗口短期注入 | 留空 | 不提供 | 精确值 `DEPLOY <target-id> TO PRODUCTION`；不得永久复用 |
| `GOOGLE_CLIENT_ID/SECRET` | 生产 OAuth client | 独立 staging client | 留空 | 必须同时配置 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | 生产域名 key pair | staging 域 key pair | 留空 | 缺失时受保护流程 fail closed |
| `RESEND_API_KEY` / `EMAIL_FROM` | 已验证生产发件域 | 独立测试域/账户 | 留空 | staging 只发公司控制的测试收件箱 |
| `CRON_SECRET` | 独立且至少 32 bytes；同时配置到应用与外部 scheduler | 独立值，只用于人工 handler QA | 留空 | 外部 scheduler 必须以 Authorization header 发送 |
| `RATE_LIMIT_SECRET` | 独立且至少 32 bytes | 独立值 | 独立低权限值 | HMAC 限流身份 |
| `TRUSTED_PROXY_HOPS` | `0`；Vercel 策略不读取它 | `0`；Vercel 策略不读取它 | `0` | 仅非 Vercel 部署使用，且必须以真实拓扑验证非零值 |
| `*_SITE_VERIFICATION` | 可选生产值 | 留空 | 留空 | 搜索引擎所有权 |

本项目冻结为显式 canonical 策略：每个启用认证的环境都必须设置 `NEXTAUTH_URL`，且运行时要求它与 `NEXT_PUBLIC_SITE_URL` 的 origin 完全一致；生产必须为 HTTPS。不会在同一发布中混用平台推断 URL。[NextAuth 配置说明](https://next-auth.js.org/configuration/options#nextauth_url)

Vercel runtime 的限流身份只读取平台生成的单值 `x-vercel-forwarded-for`，忽略可由客户端伪造的通用 `x-forwarded-for` / `x-real-ip`；头缺失或格式错误时，受保护入口按配置故障拒绝，而不是把所有请求长期合并为 `ip:unavailable`。只有非 Vercel 部署才按经过验证的 `TRUSTED_PROXY_HOPS` 从代理链右侧解析；非 Vercel Production 保持 `0` 会 fail closed。[Vercel 请求头说明](https://vercel.com/docs/headers/request-headers)

生成 secret 时可在可信本机使用 `openssl rand -hex 32`，随后直接存入对应平台的加密环境变量；不要粘贴到聊天、终端录屏或工单。

至少每 90 天及人员离职、权限变更、疑似泄露后复核 secret；轮换必须按类型执行，不能笼统假设都支持新旧双值：

- `NEXTAUTH_SECRET`：当前是单值。安排维护窗口替换并重新部署，明确现有 session/签名 token 可能失效，通知用户重新登录；只有旧值未泄露时才允许把它作为短期回滚值。
- `CRON_SECRET`：暂停外部 scheduler/确认无 worker 在运行，更新应用 Production 环境并重新部署，再把 scheduler 的 Bearer 更新为新值；人工验证新值 200、旧值 401 后恢复自动调度。当前 handler 未实现双值重叠窗口。
- `RATE_LIMIT_SECRET`：替换会改变 HMAC bucket key，相当于重置现有窗口；在低风险窗口部署并加强异常流量监控，除非另行实现双 key 迁移。
- PostgreSQL credential：优先由供应商创建新用户/密码或双 credential，更新池化与直连 URL、部署并等待旧连接排空，测试 migration/runtime 后撤销旧值。
- Resend/OAuth/reCAPTCHA：在 provider 支持时先创建第二把 key/client、更新并验证，再撤销旧值；不支持重叠时安排受控短暂停机。

疑似泄露时不保留“兼容窗口”：立即隔离入口、撤销受影响值、轮换依赖、检查日志与数据影响，并由负责人评估用户/监管通知和记录事件。

## 8. 域名与外部服务

### 8.1 Canonical 与 DNS

1. 在 Vercel 添加 apex 与 `www`，选择其中一个作为 canonical，另一个做永久重定向。
2. 按 Vercel 提示修改 DNS，验证后确认自动 HTTPS 正常。[Vercel 自定义域名](https://vercel.com/docs/domains/set-up-custom-domain)
3. Production 的 `NEXT_PUBLIC_SITE_URL`、`NEXTAUTH_URL`、metadata、sitemap 和 robots 全部指向 canonical。
4. 当 Vercel Production、`SITE_INDEXING_ENABLED=true`、`NEXT_PUBLIC_SITE_URL` 和平台 `VERCEL_PROJECT_PRODUCTION_URL` 同时有效时，`next.config.ts` 把该生产 `.vercel.app` host 永久重定向到 canonical；固定 staging 与普通 Preview 不重定向到生产，但必须启用 Deployment Protection，并输出 app-level `X-Robots-Tag: noindex, nofollow`、robots 拒绝和空 sitemap。不能只依赖平台默认 header。

### 8.2 Google OAuth

- Authorized redirect URI：`https://<canonical-domain>/api/auth/callback/google`。
- 固定 staging 使用稳定域和独立 OAuth client；动态普通 Preview URL 不作为 callback，也不验收登录。
- 普通 Preview 隐藏 Google 登录；不得回退演示账户或危险邮箱自动关联。

### 8.3 reCAPTCHA

- 生产 key 只允许 canonical hostname；固定 staging 使用独立 staging hostname/key；普通 Preview 留空并 fail closed。
- QA-004 验证 token、action/hostname、超时和上游错误均由服务端 fail closed。
- 域名切换时先更新允许域，再部署新 origin；不增加通用 bypass。

### 8.4 Resend

- 在 Dashboard 预先验证发件域或专用子域，配置 SPF、DKIM，并由域名负责人评估 DMARC。[Resend 域名说明](https://resend.com/docs/dashboard/domains/introduction)
- `EMAIL_FROM` 使用该验证域；运行时不创建、轮询或反复验证域名。
- 保留数据库 outbox、稳定幂等键和人工审查状态；不能只依赖 provider 的短期幂等窗口。

## 9. Hobby 调度与邮件 outbox

Hobby 原生 Cron 只允许每天一次，且可能在指定小时内任意时刻触发；高频表达式会让部署失败。因此仓库**不配置** `*/5 * * * *` 的 `vercel.json`，注册验证和报价邮件由外部 HTTPS scheduler 驱动。[Hobby Cron 限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)

### 9.1 外部 scheduler 契约

| 项目 | 生产值 |
|---|---|
| Method | `GET` |
| URL | `https://<canonical-domain>/api/cron/email-outbox?limit=25` |
| Frequency | 默认每 5 分钟；上线前按邮件 SLA、Hobby 额度和 outbox 压测确认 |
| Header | `Authorization: Bearer <CRON_SECRET>` |
| Transport | 只允许 HTTPS；禁止把 secret 放入 URL |
| Timeout | 50 秒，在 Vercel 函数 `maxDuration=60` 前结束 |
| Concurrency | 同一任务最多一个主动调用；重复/重叠仍由数据库租约和幂等保护 |
| Success | HTTP 200 且 JSON summary 可解析 |
| Failure | 只对网络错误和 429/500/503 有限退避；400/401/403 立即告警并停止盲目重试；不自动修改 secret |
| Observability | scheduler 执行历史 + Vercel Runtime Logs + outbox 积压/失败告警 |

外部 provider 必须支持自定义 Authorization header、HTTPS、失败历史、超时和禁用/恢复；还要记录账户所有者、免费额度/费用、数据区域、状态页、凭据轮换和退出方案。VERCEL-001 只实现此契约，QA-004 只人工验证 handler；生产 provider 在生产变更授权门选定，并由 RELEASE-001 创建，开发 Agent 不自行开户。

若目标 deployment 启用了 Deployment Protection，人工 QA/运维请求必须同时携带两个彼此独立的 header：`x-vercel-protection-bypass: <bypass-secret>` 先通过平台保护，`Authorization: Bearer <CRON_SECRET>` 再通过应用鉴权。缺少前者产生 Vercel 保护响应，不应误判为 worker 故障；缺少后者才由应用返回 401。两个 secret 均不得进入 query、日志或截图。[Vercel 自动化 bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection)

### 9.2 两层验收

- QA-004：在本地/固定 staging 验证 route、Bearer、配置解析、幂等、租约、失败和人工重复/重叠请求。普通 Preview 不配置 `CRON_SECRET`；人工请求不能证明外部 scheduler 已自动运行。
- RELEASE-001：Production 公开后启用外部 scheduler，验证至少一个真实自动周期、Bearer、200 summary、Runtime Logs、outbox 变化和失败告警。只有本层完成，才能宣布邮件调度上线。

共同必须验证：

- 无 Authorization、错误 secret 均返回 401；缺邮件/认证配置返回 503。
- 合法 `GET` 返回 200 和结构化 summary；scheduler path、method、query 与 route 一致。
- 重复或重叠触发不重复发送：数据库租约、唯一幂等键和状态转换仍生效。
- 上游 5xx/超时退避，永久 4xx 失败，模糊结果超过安全窗口进入 `MANUAL_REVIEW`。
- 为 scheduler 连续失败、401/503/500、PENDING 积压和长期 PROCESSING 设置告警。

### 9.3 可选的 Hobby 每日恢复扫描

如项目方希望增加第二层恢复，可另行配置一次/日的 Vercel Cron，例如 `0 8 * * *`。它可能在 `08:00–08:59 UTC` 运行，只能清扫外部 scheduler 遗漏的积压，不能承担验证邮件或报价通知 SLA。它仍调用同一幂等 handler；发布、回滚和关闭时单独核对。未明确需要时不增加 `vercel.json`。

不要把 `CRON_SECRET` 放到 query、文档示例、日志或截图。生产人工触发应使用受控运维工具注入 header，而不是把 secret 写入 shell history。

## 10. 首次部署操作顺序

### 10.1 QA-004：生产前演练

1. 完成 BRAND-001 与 VERCEL-001。
2. 按 [`07-testing.md`](07-testing.md) 跑 frozen install、Prisma generate/validate、lint、typecheck、`test:all`、build。
3. 由项目方 provision 或明确授权创建固定 staging、非生产托管 PostgreSQL、Resend/OAuth/CAPTCHA 等测试 provider 和公司控制的安全收件箱；记录费用、所有者、到期/清理人。QA-004 不需要创建生产外部 scheduler；没有 staging 资源授权即停在这里，不由 Agent 自行开户。
4. staging migration runner 同时注入池化 `DATABASE_URL`、直连 `DIRECT_URL` 和目标/allowlist/备份确认元数据；运行 `pnpm migration:status` 核对脱敏目标，再执行 `pnpm migration:deploy`。
5. 普通可信分支 Preview 只验收 Deployment Protection、构建/页面、无 provider secret 和 app-level noindex；不可信分支/fork 不获得数据库 secret。
6. 在固定域 staging 使用独立数据库和 provider 完成品牌、认证、询价、RBAC、文章/SEO、outbox、日志脱敏与 noindex；独立 `CRON_SECRET` 只用于人工验证 handler/重复调用。受 Deployment Protection 时，受控请求同时发送 `x-vercel-protection-bypass` 和应用 Authorization header；不宣称已验证外部 scheduler 自动运行。
7. 使用带 release/QA ID 的合成 staging 数据；测试后按责任表清理或归档，撤销临时 secret，保留无凭据证据。

### 10.2 RELEASE-001：生产变更窗口

仅在明确授权后：

1. 冻结发布版本，记录 Vercel Hobby 使用资格确认人、数据库/域名/外部 scheduler/其他服务负责人、回滚决策人和允许的生产目标摘要。
2. 记录自动备份/PITR 快照 ID，确认在隔离恢复库达到约定 RPO/RTO；核对 migration 为向后兼容变更。
3. 从受控 release runner 同时注入同一 Production 的 `DATABASE_URL`、`DIRECT_URL` 和第 6.3 节目标元数据。执行人运行 `pnpm migration:status` 展示脱敏 provider/target/region/database/user；第二人和数据库负责人核对目标/备份后，短期设置精确生产确认并执行 `pnpm migration:deploy`。不得使用 `db push`。
4. 在任何 Production deployment 对公网开放前，发布与冻结 source revision 对应的 Corresponding Source URL/归档，包含安装/构建脚本和适用 notices；从未登录会话验证约定入口可取得。若不能先完成，后续 Production 必须一直受 Deployment Protection 保护。
5. 在 Production Deployment Protection 保持开启的状态下触发 deployment；检查 Build Logs 的 Node/pnpm 版本、Prisma generate、Next build、环境作用域，并把 deployment ID 绑定到第 4 步的 source revision。
6. 绑定/切换 canonical 域名，仍保持保护；核对 HTTPS、apex/`www`、生产 `.vercel.app` 永久重定向、metadata、robots/sitemap。
7. 在外部 scheduler 中创建但暂不启用 Production 任务，核对 URL、每 5 分钟频率、Bearer、超时、失败告警和账户所有者；不把人工 handler 请求当作自动运行证据。
8. 在 Deployment Protection 下注册获批准的管理员账户。验证邮件入 outbox 后，使用不记录 header 的受控运维请求，同时发送 `x-vercel-protection-bypass: <automation-bypass-secret>` 与 `Authorization: Bearer <CRON_SECRET>` 到生产 `GET /api/cron/email-outbox?limit=25`，人工 drain 一次；禁止把两个 secret 放入 URL、shell history 或日志。参见 [Vercel 自动化 bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection)。收到邮件并完成验证后，受控 runner 同时获得同一 Production 的两个数据库 URL，先显示脱敏目标并要求显式生产确认，再运行：

   ```bash
   pnpm admin:promote --email <approved-admin-email>
   ```

9. 使用公司控制的合成 smoke 账户和统一 `SMOKE-<release-id>` 标记完成下节检查；凡需邮件的步骤继续使用第 8 步双 header 受控人工 drain，不能提前启用 scheduler。由发布负责人关闭/归档/清理可删除记录，保留安全/权限/变更审计所需证据，不加载自动化 fixtures。
10. “解除保护/公开门”全部签字后才解除 Production Deployment Protection；立即从公网匿名验证站点与源码入口，启用外部 scheduler，并等待首个自动周期，确认 Bearer、200 summary、Runtime Logs 和 outbox 无异常积压。任一失败立即暂停 scheduler、恢复保护/回滚，不能宣布上线；全部通过后记录 deployment ID、migration、scheduler、管理员、数据清理、源码 URL、备份、监控和回滚负责人。

`admin:promote` 只提升已存在且已验证的账户，不创建用户或密码。它强制使用 `DIRECT_URL`，显示与 migration 相同的脱敏目标摘要，并在 Production 要求相同格式的显式生产确认；每个环境分别执行，禁止演示账户和共享管理员凭据。

## 11. 生产 Smoke 清单

### 11.1 公开与 SEO

- [ ] `/`、`/solutions`、八个方案、`/news`、一篇已发布文章、`/about`、`/contact` 返回预期状态。
- [ ] Header/metadata/manifest 显示 `ZNB`；法定语境显示 `ZNB Logistics Inc.`；无品牌 `Company Name`、示例邮箱/电话/地址或虚构指标。
- [ ] canonical 只指正式域名；apex/`www` 与 `.vercel.app` 策略正确。
- [ ] Production `/robots.txt`、`/sitemap.xml` 可读，草稿不公开，发布文章进入 sitemap；固定 staging 与普通 Preview 均有 Deployment Protection、`X-Robots-Tag: noindex, nofollow`、robots 拒绝且不暴露 sitemap。
- [ ] 404、移动端、键盘焦点、语言切换和长法文无回归。

### 11.2 认证、询价与权限

- [ ] 缺失/无效 CAPTCHA 被拒绝；有效生产 CAPTCHA 才能注册和提交询价。
- [ ] 邮箱验证邮件到达且链接只使用正式域名；未验证账户不能登录。
- [ ] Google OAuth（若启用）使用正确 callback，未配置时入口隐藏。
- [ ] 匿名询价不按邮箱自动认领；登录用户只能看到自己的询价/通知。
- [ ] ADMIN/STAFF/FINANCE/WAREHOUSE/CUSTOMER/PARTNER 能力与矩阵一致；最后一个管理员保护有效。
- [ ] 报价状态、站内通知和邮件 outbox 去重；文章草稿/发布/归档权限正确。
- [ ] 所有生产 smoke 数据使用获批公司控制账户和 `SMOKE-<release-id>` 标记；询价已关闭、文章已归档、可删除记录已按负责人/保留策略处理，必要审计记录保留。

### 11.3 运维

- [ ] 调度 handler 未授权请求 401；外部 scheduler 已按约定频率自动触发并注入 Bearer，积压/FAILED/MANUAL_REVIEW 可观察。
- [ ] Build/Runtime/scheduler/数据库/Resend 日志无密码、token、完整数据库 URL 或不必要的个人资料。
- [ ] 数据库连接数、函数错误、延迟、邮件失败和备份状态有告警接收人。
- [ ] Production 不含测试 fixtures、测试用户密码、bypass 或 Preview credential。
- [ ] 与本 deployment/revision 对应的源码 URL/归档可由未登录用户按约定入口取得，包含安装/构建脚本和适用 notices。

## 12. 监控、回滚与故障处理

### 12.1 日常监控

- Vercel Build Logs：依赖/Node/pnpm 版本、构建和环境错误。
- Runtime Logs：5xx、认证配置、Prisma 连接池、限流和输入错误；按最小必要原则记录。
- 外部 scheduler 与 Runtime Logs：触发时间、401/503/500、连续漏跑、处理计数和耗时。
- PostgreSQL：连接数、CPU/存储、慢查询、备份和恢复验证。
- Resend/outbox：PENDING 积压、长期 PROCESSING、FAILED、MANUAL_REVIEW、投递/退信。

Vercel 的日志能力见 [Logs 文档](https://vercel.com/docs/logs)。如需长期审计或告警，配置受控 Log Drain 和保留期；不把完整用户输入或 secret 当作可观察性数据。

### 12.2 应用回滚

1. 暂停继续发布，确认影响范围和最近 migration。
2. 若数据库仍兼容旧应用，可使用 Vercel Instant Rollback 切回已知良好 deployment。
3. 回滚前暂停外部 scheduler；回滚后重新核对域名、环境变量、scheduler 目标、outbox 和其他 provider，再恢复调度。不能假定外部服务随代码自动恢复。
4. 记录事件、数据影响、补救和重新发布条件。

[Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) 只切换应用 deployment，不撤销 PostgreSQL migration，也不恢复 DNS、Resend、OAuth 或 CAPTCHA 状态。破坏性 schema 变更必须通过 expand/contract 避免把“恢复数据库”当作普通回滚步骤。

### 12.3 数据库事故

- 立即暂停会扩大损害的写入和外部 scheduler，由数据库负责人评估连接、锁、迁移和数据范围。
- 不在未确认目标的情况下运行 `db push`、手写修复 SQL 或从本地测试脚本清理生产。
- 只有经验证备份和负责人批准才恢复；恢复后核对 migration 表、用户隔离、outbox 幂等和文章状态。

## 13. 发布记录模板

```text
Release:
Approved by / time:
Vercel project / deployment ID:
Canonical domain:
Node / pnpm:
Database provider / region (no URL):
Migration preflight reviewer / target summary:
Migration status:
Backup/PITR ID / RPO-RTO restore evidence / owner:
External scheduler provider / frequency / first successful run:
Admin initialized:
Smoke evidence:
Staging resource/secret cleanup:
Production smoke data disposition:
Monitoring owner:
Rollback decision owner:
Known follow-ups:
Corresponding Source URL / deployed revision / access check / review owner:
```

发布记录不得包含 secret、密码、token、完整数据库连接串或真实客户数据。

## 14. 生产变更授权门（Go/No-Go）

- [ ] `BRAND-001`、`VERCEL-001`、`QA-004` 均完成且无跳过项。
- [ ] Vercel Hobby、PostgreSQL、域名、外部 scheduler、额度监控和责任人已确认；项目方已确认 Hobby 使用资格或取得 Vercel 允许，否则不得公开。
- [ ] 正式公司资料、法律文本和授权素材已审核；未确认模块保持隐藏。
- [ ] Production/Preview/Development 环境与数据库完全隔离。
- [ ] migration 双 URL/preflight/双人复核、PITR/RPO/RTO 恢复证据、调度 handler、监控、管理员初始化和回滚流程演练完成；真实 Production 外部 scheduler 自动触发在 RELEASE-001 公开后、任务完成前验收。
- [ ] AGPL-3.0 网络源码提供和第三方许可由项目方审核；与拟发布 revision 对应的源码归档/URL、构建安装脚本和 notices 已发布并通过匿名访问验收，或明确保持 Production Deployment Protection 直到该项完成。
- [ ] 项目负责人已对 `RELEASE-001` 给出明确生产授权。

任一项未完成即为 No-Go；不得以“上线后再补”绕过安全、数据、法律或品牌事实门禁。

本节决定是否授权进入 RELEASE-001；RELEASE-001 第 10 步的“解除保护/公开门”是第二个独立签字点，只在保护态迁移、管理员初始化和 smoke 全部通过后决定是否向公网开放。
