# 技术执行计划

状态：原始方案已实施；2026-08-17 新增品牌与 Vercel 发布波次  
日期：2026-08-17

> 进度说明：Wave 0～7 已由 FND-001～QA-003 完成。新增 Wave 8～10 用于接入 `ZNB Logistics Inc.` / `ZNB`、Vercel 生产运行契约和发布验收；新增任务以 [`05-agent-backlog.md`](05-agent-backlog.md) 为准。

## 1. 执行原则

1. 先稳定数据、授权和服务契约，再重做页面；避免 UI 建在错误枚举或错误权限上。
2. 删除功能必须删除完整纵向切片：页面、API、配置、翻译、数据结构、baseline、依赖、资产和文档引用。
3. 服务端是安全边界。客户端 guard、隐藏按钮和禁用状态都不能代替 API 授权或校验。
4. 数据归属只使用已认证主体的不可伪造标识，不能用未验证邮箱推断所有权。
5. 外部服务缺配置时显示“不可用”或失败，不以成功回退。
6. 新项目无生产数据的前提下只维护一个最终 `0_init` baseline；一旦出现共享/生产数据库就停止重写。
7. 依赖以实际 import 和业务价值为依据；为安全渲染或测试新增的少量依赖必须有明确用途。
8. 不用 `any`、吞异常、关闭 lint 或跳过类型错误来制造通过。

## 2. 目标技术结构

```text
Next.js App Router
├── Public server components
│   ├── 企业展示与解决方案（配置驱动）
│   └── 新闻/固定页面（Prisma 直读、服务端渲染）
├── Authenticated user area
│   ├── profile / password / settings
│   ├── quotes（严格 userId）
│   └── notifications
├── Admin area
│   ├── server capability authorization
│   ├── quote operations
│   ├── article/page publishing
│   └── user/role/notification administration
├── Route handlers
│   ├── Zod input boundaries
│   ├── CAPTCHA / rate limit / auth
│   └── domain services + Prisma transactions
└── PostgreSQL via Prisma
    └── one clean 0_init baseline while pre-production
```

公开新闻和固定页面优先在 server component 中直接读取 Prisma，避免页面为获取自己的数据再绕一层 HTTP。对外 API 只保留确有客户端或集成消费需求的端点。

## 3. 数据结构计划

### 3.1 必删结构

- `ScanContainer`、`SkuScan`、`ScanStatus`、`ScanMode`。
- `User.twoFactorEnabled`、`User.twoFactorSecret`。
- `User.newsUpdates`；将含义模糊的 `quoteUpdates` 重命名为 `quoteEmailUpdates`。
- 默认方案下删除未使用的 `Contact`、`ContactStatus`。

删除必须同步 `schema.prisma` 与 `0_init/migration.sql`。新项目没有数据迁移需求；如发现任何非空共享数据库，立即停止并改写为增量迁移方案。

### 3.2 `ServiceType`

目标枚举：

```text
FBA_LAST_MILE
TRUCK_FREIGHT
CROSS_BORDER
AMAZON_FBA
EXPRESS
WAREHOUSE
DROPSHIPPING
RETURNS
OTHER
```

`solutionConfigs` 每项显式声明 `serviceType`。Zod、Prisma、表单、后台、用户中心和翻译标签从共享定义派生，禁止字符串强制转换。

### 3.3 Quote

最低调整：

- 所有权只由 `userId` 决定；访客可为空。
- 报价金额从自由文本改为 `Decimal`，并使用独立 ISO 4217 三字母 currency 字段；公司未确认前不设 CAD/USD 等业务默认值。
- 明确区分客户可见备注与内部备注，防止内部信息被用户中心展示。
- 将重量与尺寸改为值和单位分离的结构化字段：`weightValue + WeightUnit(KG/LB)`、`length/width/height + DimensionUnit(CM/IN)`；`pieceCount/cartonCount/palletCount` 用非负整数，避免后台解析自由文本。值存在时对应单位必须存在。
- 为 `(userId, createdAt)` 和 `(status, createdAt)` 增加组合索引。
- 状态更新使用事务：读取旧状态、验证合法转换、写入报价、写 QuoteEvent，并在同一事务创建站内通知及邮件 outbox 项。

状态机固定为 `PENDING → PROCESSING → QUOTED → ACCEPTED/REJECTED → CLOSED`。下表是完整转换白名单；矩阵外转换返回 409，无状态变化的请求返回当前结果且不产生 QuoteEvent、通知或邮件。

| from | to | 可执行角色 | 前置条件 |
|---|---|---|---|
| `PENDING` | `PROCESSING` | ADMIN、STAFF | 无 |
| `PROCESSING` | `QUOTED` | ADMIN、STAFF、FINANCE | amount 大于 0、currency 合法且两者成对存在 |
| `QUOTED` | `ACCEPTED` | ADMIN | 已取得线下或其他已授权渠道的客户确认 |
| `QUOTED` | `REJECTED` | ADMIN | 无；面向客户的原因写入客户可见备注 |
| `ACCEPTED` / `REJECTED` | `CLOSED` | ADMIN | 正常结案 |
| `PENDING` / `PROCESSING` / `QUOTED` | `CLOSED` | ADMIN | 提前终止；QuoteEvent reason 必填，trim 后 10–500 字符 |
| `PROCESSING` | `PENDING` | ADMIN | 回退；QuoteEvent reason 必填，trim 后 10–500 字符 |
| `QUOTED` | `PROCESSING` | ADMIN | 撤回报价；QuoteEvent reason 必填，trim 后 10–500 字符 |
| `ACCEPTED` / `REJECTED` | `QUOTED` | ADMIN | 更正结果；QuoteEvent reason 必填，trim 后 10–500 字符 |
| `CLOSED` | 任意状态 | 无 | `CLOSED` 是终态；MVP 不重开，需创建新询价 |

字段编辑权限固定如下；请求原文在创建后对所有角色只读，避免后台静默改写客户提交。

| 字段/操作 | ADMIN | STAFF | FINANCE | CUSTOMER/PARTNER |
|---|---|---|---|---|
| amount、currency | `PROCESSING` 可编辑 | 不可编辑 | `PROCESSING` 可编辑 | 只读 |
| 客户可见报价备注 | `PROCESSING` 可编辑 | `PROCESSING` 可编辑 | `PROCESSING` 可编辑；这就是“报价备注” | 只读 |
| 内部备注 | 除 `CLOSED` 外可编辑 | 除 `CLOSED` 外可编辑 | 不可编辑 | 永不可见 |
| status | 按上表 | 仅两项指定前进转换 | 仅 `PROCESSING → QUOTED` | 只读 |
| 删除 | 仅可软删除仍为 `PENDING` 的重复/测试/无效记录 | 不可 | 不可 | 不可 |

ADMIN 修改已发布报价前必须先回退到 `PROCESSING`；不能在 `QUOTED` 或其后状态直接改金额、币种或客户可见备注。软删除需要 10–500 字符原因并写 `deletedAt`、`deletedById`、`deleteReason`；正常查询默认排除软删除记录，已进入 `PROCESSING` 的业务记录只能关闭、不能删除。

询价请求契约固定如下：

| 字段 | 规则 |
|---|---|
| `submissionKey` | 客户端生成 UUID；数据库唯一，用于安全重试与防重复提交 |
| `name` | trim 后 2–100 字符 |
| `email` | trim + lowercase，最长 254 |
| `phone` | trim 后 7–32 字符，不用单一国家格式误拒绝海外号码 |
| `company` | 可空，最长 160 |
| `serviceType` | 九项稳定枚举之一 |
| `origin` / `destination` | 可空，各最长 160 |
| `cargoType` | 可空，最长 120 |
| `pieceCount` / `cartonCount` / `palletCount` | 可空整数，0–1,000,000 |
| `weightValue` | 可空 `Decimal(14,3)`，大于 0；存在时 `weightUnit` 必填 |
| `weightUnit` | `KG` 或 `LB` |
| `length` / `width` / `height` | 可空 `Decimal(12,3)`，大于 0；任一存在时三项和单位均必填 |
| `dimensionUnit` | `CM` 或 `IN` |
| `requestedDate` | 可空 ISO 日期，不早于提交日 |
| `message` | trim 后 10–4,000 字符 |
| `captchaToken` | 仅请求使用，不入库 |

Quote 另有对外唯一 `reference`，格式为 UTC 日期加不可预测随机段：`Q-YYYYMMDD-XXXXXXXX`；随机段使用加密安全的 Crockford Base32 字符并由唯一索引兜底，不向客户暴露 cuid。首次成功创建返回 HTTP 201；相同 `submissionKey` 且同一主体/请求指纹的重试返回同一 reference，不重复写库，不同指纹复用同一 key 返回 409。

请求指纹使用版本化 canonical JSON 的 SHA-256，并保存为 `submissionFingerprint`。主体是登录用户的 `userId`，或匿名请求经 trim/lowercase 的 email；canonical payload 包含 `name`、`email`、`phone`、`company`、`serviceType`、`origin`、`destination`、`cargoType`、三项 count、重量/单位、长宽高/单位、`requestedDate`、`message` 和主体。字符串先 Unicode NFC + trim，email lowercase，空可选字符串转 `null`，整数使用十进制，Decimal 使用无指数且去除非必要尾零的规范字符串，日期固定 `YYYY-MM-DD`，对象 key 按契约固定顺序序列化。`submissionKey`、`captchaToken`、reference、status、时间戳及其他服务端派生字段明确排除；CAPTCHA token 改变不能把同一业务请求伪装成不同请求。

统一 JSON 响应：成功为 `{ success: true, data: { reference, status } }`；失败为 `{ success: false, error: { code, message, fieldErrors? }, requestId }`。校验 400/422、未认证 401、无权 403、冲突 409、限流 429、配置不可用 503、未知服务错误 500。

报价金额为 `Decimal(14,2)` 且大于 0，currency 匹配 `^[A-Z]{3}$`；客户可见备注和内部备注各不超过 4,000 字符。

每次有效状态转换创建 `QuoteEvent`（quoteId、actorId、fromStatus、toStatus、reason、requestKey、createdAt）。`requestKey` 唯一以保证管理端重试幂等；通知与邮件由 QuoteEvent id 派生事件键。

### 3.4 Article

建议在新 baseline 一次补齐：

- `authorId` 可空外键关联 User，删除用户时 `SetNull`。
- 保留作者展示名快照，历史文章不因用户改名而失去署名。
- `seoTitle`、`seoDescription`、`coverImageAlt` 可空字段。
- slug 唯一且首次发布后稳定。
- `publishedAt` 只记录首次发布，`updatedAt` 记录修改。
- `(status, publishedAt)` 组合索引。

文章语言字段与 locale 路由一起设计，当前不在只有客户端语言切换的结构上半做多语言 SEO。

### 3.5 Notification 与 LoginHistory

- Notification 增加 `(userId, isRead, createdAt)` 查询索引。
- Notification 增加可空 `eventKey`，以 `(userId, eventKey)` 唯一约束防止同一业务事件重复写入。
- 通知的 `type`、link 和接收人必须服务端验证；link 仅允许站内相对路径或明确白名单。
- 统一通知服务读取用户偏好，业务 API 不再各自直接拼装。
- LoginHistory 只由认证事件内部写入；删除未认证 POST。
- 登录记录失败应记录可观察日志，但不能让认证流程因审计表暂时失败而泄漏内部错误。

邮件副作用采用 PostgreSQL transactional outbox，不能在业务事务提交前直接调用 provider。最终 baseline 增加：

- `EmailOutbox`：`id`、唯一 `idempotencyKey`、`eventKey`、收件人、不可变 payload、`status`、`attemptCount`、`nextAttemptAt`、`lockedAt`、`firstAttemptAt`、`sentAt`、`providerMessageId`、脱敏 `lastError`、时间戳；状态至少覆盖 `PENDING/PROCESSING/SENT/FAILED/MANUAL_REVIEW`。
- `NotificationBroadcast`：唯一客户端 UUID `requestKey`、`payloadFingerprint`、actor、目标范围和创建时间。相同 key + 相同 payload 返回原结果，不同 payload 返回 409；每位接收者的 eventKey 为 `broadcast/{broadcastId}`，禁止每次重试生成新 UUID。MVP 人工广播仅创建站内通知，不发送群发邮件。

报价状态事务按“Quote + QuoteEvent + 有账户时的 Notification + 符合偏好时的 EmailOutbox”原子提交。`站内通知始终创建` 只指 `quote.userId != null`；匿名询价没有用户中心、站内通知或报价状态邮件。账户报价邮件只发送到已验证的账户邮箱，且仅在 `emailNotifications && quoteEmailUpdates` 时入 outbox。邮箱验证、密码重置和安全告警属于必要事务邮件，不受营销/报价邮件偏好开关影响。

worker/受保护 cron 以租约方式领取 outbox，发送成功后保存 provider id；超时、5xx 按退避重试，永久 4xx 标记 FAILED。Resend 请求使用稳定且不超过 256 字符的 `Idempotency-Key`（如 `quote-status/{quoteEventId}/{userId}`），payload 创建后不可变；[Resend 官方幂等键](https://resend.com/docs/dashboard/emails/idempotency-keys)窗口为 24 小时。对“provider 可能已接收但本地未确认”的模糊结果，只在该窗口内自动重试；超过窗口转 `MANUAL_REVIEW`，避免再次发送。邮件失败不回滚业务状态，并必须有结构化日志、待处理计数和人工重试入口。

### 3.6 RateLimitBucket

默认使用 PostgreSQL 持久化公共表单与认证限流，不接受仅存在单个 Node 进程内的 `Map` 作为生产实现。最小字段为 action、经服务端密钥散列的主体/IP key、windowStart、count、expiresAt；建立 `(action, keyHash, windowStart)` 唯一约束和 expiresAt 清理索引。若未来部署平台提供等效的持久化限流，可替换实现而不改变调用接口。

默认窗口：凭证登录按 `IP + emailHash` 每 15 分钟 10 次；注册按 IP 每小时 5 次；询价按 IP 每小时 10 次且按 emailHash 每小时 3 次；重发验证邮件按 emailHash 每小时 3 次。所有 key 使用 `RATE_LIMIT_SECRET` 做 HMAC，不保存原始 IP/邮箱。通过 `TRUSTED_PROXY_HOPS` 明确可信代理层数；生产未配置可信来源时拒绝把任意 `x-forwarded-for` 当作客户端 IP。

### 3.7 索引与 baseline 卫生

- 删除 `@unique` 已覆盖的无意义重复索引，例如 Article slug 的重复普通索引。
- 常用组合索引以实际查询为依据，避免为未实现业务预建大量索引。
- `prisma format` 后生成并人工复核 baseline；空 PostgreSQL 只能依靠 `0_init` 完整部署。

## 4. 认证与安全方案

### 4.1 Credentials 注册/登录

- 邮箱统一 `trim` 和 lowercase 后再查询及写入。
- 删除 demo 分支；错误信息不区分“用户不存在”和“密码错误”。
- 密码策略、哈希成本和最大输入长度用共享 Zod schema 固化。
- 注册返回 Zod 400/422、邮箱冲突 409、服务异常 500，不将所有错误压成同一 500。
- 删除按邮箱自动认领历史 Quote/Contact。
- 本阶段完成邮箱验证；现有 `VerificationToken` 和 `emailVerified` 可复用。Credentials 用户在验证邮箱前不能建立登录 session，只能重新发送验证邮件。无论验证状态如何，数据都只能按 `userId` 访问。

### 4.2 CAPTCHA

实现单一服务端 verifier，供 credentials authorize、register 和公共询价调用：

1. 客户端获取一次性 token 并随业务请求提交。
2. 服务端校验 token、预期 action/hostname（provider 支持时）和响应。
3. token 缺失/失效、secret 缺失、上游错误、超时均 fail closed。
4. 删除 `SimpleMathCaptcha`、`useCaptcha` 的自动成功分支和单独可绕过的验证调用方式。
5. 本地/CI 使用 provider 官方测试密钥或可注入的测试 verifier；生产构建不得包含通用 bypass token。

应用可以在未配置 CAPTCHA 时构建和启动，但受保护的表单必须显示明确的“验证服务未配置”并拒绝业务提交。

### 4.3 OAuth

- Google provider 仅在 client ID 与 secret 同时存在时注册，登录/注册页据此显示入口。
- 删除 `allowDangerousEmailAccountLinking`。
- 账户合并必须建立在 provider 已验证邮箱及明确的安全策略上，不由相同字符串自动决定。

### 4.4 2FA

当前实现完整删除，不替换。未来真实 2FA 需要独立威胁模型、成熟 TOTP 库、secret 加密、恢复码、重放防护、登录挑战、撤销和审计，不属于本轮完成条件。

### 4.5 富文本

新项目没有需要兼容的生产文章，目标格式固定为 Markdown：

- 服务端 Markdown 渲染，默认禁用原始 HTML。
- 链接协议、图片来源、标题层级和表格输出受控。
- 新闻与固定页面共用同一渲染组件。
- 预览和公开页使用同一组件。
- 不引入允许原始 HTML 的插件；`<script>`、事件属性、`javascript:` URL 等测试载荷都不能执行。

### 4.6 授权

建立能力常量与服务端帮助函数，例如：

```text
admin.overview
quotes.read
quotes.update
articles.manage
pages.manage
users.manage
notifications.broadcast
settings.manage
```

- API 每次敏感请求从数据库读取当前用户角色/文章权限，不能长期只信 JWT 中的旧声明。
- 菜单、默认落地页和 API 共享同一矩阵。
- 防止删除或降级最后一个 ADMIN。
- `canManageArticles` 只对 STAFF 生效；角色改变时清理不适用的 flag。
- 提供无硬编码密码、幂等的一次性管理员提升脚本，例如把已存在且已验证的邮箱提升为 ADMIN。

## 5. 核心服务计划

### 5.1 询价服务

- 一个 Zod schema 负责客户端类型和服务端最终校验；服务端不可相信浏览器校验。
- 统一服务枚举与标签。
- 访客 `userId=null`；登录者仅绑定 session id。
- 公共入口具备 CAPTCHA、限流、长度限制和一致错误响应。
- 写库成功与邮件发送解耦：邮件失败不能把已创建询价伪报为失败，也要可观察和可重试。
- 邮件发送路径只发送邮件，不创建/查询/验证 Resend 域名；所有用户输入先 HTML escape。

### 5.2 报价与通知

- ADMIN、STAFF、FINANCE 严格按 3.3 节转换与字段矩阵读取和更新报价；字段级权限在服务端实施。
- 状态转换显式校验；无变更请求不写库、不发通知。
- 只有 `quote.userId != null` 才创建面向询价者的报价状态站内通知；`emailNotifications` 是邮件总开关，`quoteEmailUpdates` 控制报价邮件；MVP 不保留没有事件来源的 `newsUpdates`。
- 通知服务统一生成多语言文案、读取偏好，并在业务事务内创建站内通知与 EmailOutbox；任何业务 API 都不能直接发送 provider 邮件。
- 必要认证/安全邮件忽略普通邮件偏好，但同样使用 outbox；人工广播只允许 ADMIN，MVP 仅站内并使用客户端 requestKey 幂等。
- 管理后台“消息管理”明确为“通知管理”。

### 5.3 文章服务

- 创建/更新共享 Zod schema，覆盖 slug、excerpt、tags、cover、SEO 字段和状态。
- slug 冲突返回 409；发布/归档语义一致。
- STAFF 的 `canManageArticles` 在所有文章 API 生效。
- 公共列表/详情只读 PUBLISHED；授权预览单独走受保护路径。
- 发布后 `revalidatePath` 或等效缓存失效，sitemap 与公开页同步更新。

已发布 slug 在 MVP 绝对不可修改；未来若允许修改，必须先增加 redirect 数据模型。预览路由固定为受能力保护的 `/admin/articles/[id]/preview`。文章归档后重新发布保留首次 `publishedAt`，只更新 `updatedAt`。

## 6. SEO 技术计划

- 将新闻列表和详情改为 server component；服务端 HTML 包含标题、摘要或正文。
- 解决方案详情使用 `generateMetadata` 和真实 canonical。
- 文章详情生成 title、description、canonical、Open Graph 和 Article JSON-LD。
- sitemap 查询已发布文章，并使用数据库时间；不对所有静态页写当前时间。
- 公司名称已经确认，但正式域名、Logo、地址和联系资料未完整前继续暂停 Organization/LocalBusiness 输出；只在实体配置通过完整性校验时渲染。
- 未实现真实 locale 路由前移除 `/zh`、`/en`、`/fr` alternates。
- robots 继续阻止 `/admin`、`/user`、API 和认证页，验证规则与实际路由一致。
- 发布页保证单一 H1、语义标题、图片 alt、可抓取分页和站内关联链接。

## 7. 视觉实施计划

视觉规格以 `03-product-design-spec.md` 为唯一方向：

1. 先建立颜色、字体、间距、边框、焦点、状态和后台 sidebar token。
2. 重构全局 layout、Header、Footer 与可访问导航。
3. 按新信息架构重做首页和方案总览/详情。
4. 重做 `/contact` 询价状态和新闻列表/详情。
5. 将登录、注册、用户中心和后台壳层统一到同一视觉系统。
6. 最后处理微动效、宽屏与 reduced-motion，避免动效掩盖未完成逻辑。

素材未确认前只使用可替换占位或 CSS 构图，不使用现有错误商标图作为最终资产。

## 8. 依赖与配置计划

### 8.1 明确删除

- `html5-qrcode`、`xlsx`
- `qrcode`、`@types/qrcode`
- `@sanity/client`、`contentful`、`next-sanity`
- `next-intl`
- `@vercel/speed-insights`（初期未实际使用）

删除 `src/lib/cms/**`，同步清理 `next.config.ts` 中 Sanity/Contentful 图片域名和不存在的 `@radix-ui/react-icons` 优化项。`@types/bcryptjs` 在安装后验证 `bcryptjs@3` 自带类型再决定。

为安全 Markdown 渲染、自动化测试或限流新增的依赖必须在任务中说明用途、替代方案和体积影响。

### 8.2 package scripts

- 新增 `typecheck: tsc --noEmit`。
- 新增 `prisma:validate`，保留明确的 generate/migrate 命令。
- 删除会在构建中隐式 `migrate deploy` 的 `build_comment`。
- `build` 只负责生成 Prisma Client 和 Next 生产构建，不修改数据库。
- 根据 lockfile 中 Next 16.1.1 的要求把 Node engine 从 `>=18.x` 调整为 `>=20.9.0`。
- 增加 `packageManager: pnpm@10.27.0`，保证 Agent 与 CI 使用同一 pnpm 版本和 lockfile 语义。
- 在 `package.json` 增加 SPDX `license: AGPL-3.0-only`。

### 8.3 环境变量

创建可提交的 `.env.example`，并在 `.gitignore` 增加 `!.env.example`。至少记录：

- `DATABASE_URL`
- `DIRECT_URL`：Vercel 目标契约中只供 Prisma migration/admin 使用的直连 URL；不得进入浏览器或普通 Preview
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`：生产 canonical origin；也可在验证 Vercel System Environment Variables 后采用 NextAuth 的平台自动识别策略
- `NEXT_PUBLIC_SITE_URL`：唯一站点 URL；生产必须为绝对 HTTPS，开发允许 localhost；删除 `NEXT_PUBLIC_APP_URL`
- 可选 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`、`RECAPTCHA_SECRET_KEY`
- `RESEND_API_KEY`、`EMAIL_FROM`、`EMAIL_TO`
- `RATE_LIMIT_SECRET`、`TRUSTED_PROXY_HOPS`
- 可选搜索引擎验证变量

示例只使用不可用占位，不写真实凭据。构建/metadata 需要有效 `NEXT_PUBLIC_SITE_URL`，需要预渲染数据库内容的构建还需要 `DATABASE_URL`；认证、CAPTCHA、邮件和限流密钥只在对应运行时入口校验。生产环境中 Credentials 注册/登录开启时，CAPTCHA、邮件验证和限流配置全部为必需。

## 9. 实施波次与依赖

```text
Wave 0  契约冻结与工具链
   │
Wave 1  删除扫码 / 中加方案 / 伪2FA / 演示登录
   │
Wave 2  schema、baseline、服务枚举、数据归属
   │
Wave 3  测试基础 / CAPTCHA / OAuth / RBAC / 内容安全
   ├───────────────┐
Wave 4A 询价-报价-通知   Wave 4B 文章-SEO
   └───────────────┘
               │
Wave 5  海外仓视觉与页面重构
               │
Wave 6  死代码/依赖/资产/文档清理
               │
Wave 7  安装、数据库基线、自动化与全量验收
               │
Wave 8  ZNB 品牌语义接入
               │
Wave 9  Vercel Hobby / PostgreSQL / 外部调度生产契约
               │
Wave 10 隔离 Preview QA → 人工 Go/No-Go → 生产发布
```

Wave 1–3 触碰 `schema.prisma`、baseline、`package.json`、`site-config.ts` 和三份 locale，是冲突热点，建议由一个集成 Agent 串行完成。Wave 4A 和 4B 可在接口契约冻结后并行；Wave 5 按页面文件分工，但全局 token、Header 和 Footer 仍由单一所有者维护。

## 10. 质量与测试门禁

### 10.1 静态门禁

1. `pnpm install` 更新 lockfile。
2. `pnpm install --frozen-lockfile` 验证可复现安装。
3. 启动隔离的测试 PostgreSQL 并只部署 `0_init`。
4. `pnpm prisma:generate`。
5. `pnpm prisma:validate`。
6. `pnpm lint`。
7. `pnpm typecheck`。
8. 使用测试 `DATABASE_URL` 执行 `pnpm build`。

不得通过关闭规则、`skipLibCheck` 扩大、`ignoreBuildErrors` 或宽泛 `any` 绕过失败。

### 10.2 数据库门禁

- 在空 PostgreSQL 仅部署 `0_init` 成功。
- Prisma schema 与 baseline 结构一致。
- 无 Scan、2FA、Contact（按默认决策）结构残留。
- 所有九个 `ServiceType` 值可写入和读取。
- 组合索引存在，金额精度与 currency 约束正确。

### 10.3 自动化或集成测试重点

- demo 登录失败；CAPTCHA 缺失/假 token/上游失败均拒绝。
- 新注册相同邮箱不能读取历史访客询价。
- 每个服务类型完成表单到数据库闭环。
- 用户 A 不能读取用户 B 的询价或通知。
- STAFF 文章 flag 与报价能力、FINANCE 报价字段、撤权后的 403 与矩阵一致。
- 富文本测试载荷不会执行。
- 草稿公开 404，发布文章在 HTML、metadata 和 sitemap 中可见。
- 同一报价状态重复请求不产生重复通知。

### 10.4 浏览器冒烟

- 320/375/768/1024/1440/1920 无横向滚动。
- 键盘完成导航、注册/登录、询价、报价、文章发布和通知读取。
- 验证移动菜单、长法文、200% 缩放、reduced-motion、错误与空状态。
- 对关键公开页面检查无 console error、无 hydration error、无失效图片。

## 11. 发布前配置门

公司法定/展示名称已确认为 `ZNB Logistics Inc.`，网站简称为 `ZNB`。正式发布仍必须提供并审核：正式域名、联系资料、真实服务区域、公司介绍、隐私政策与条款、仓库素材及授权、Logo/图标、社交链接、可公开运营数据、合作伙伴授权，以及 AGPL-3.0 网络部署的源码提供机制。配置未通过时不得输出 LocalBusiness、假统计或合作 Logo。

Vercel Hobby 发布还必须通过以下技术门禁：Production/Preview/Development 凭据和数据库隔离；运行时池化 `DATABASE_URL` 与迁移 `DIRECT_URL` 分离；迁移不进入普通 build；外部调度器使用受 Bearer 保护的 `GET` 调用 outbox 并保持幂等/租约；不把 Hobby 每天一次、小时级精度的原生 Cron 当作邮件主链路；函数区域与数据库区域经实际供应商确认；数据库备份、恢复和向后兼容迁移策略可执行。具体流程见 [`08-vercel-production-deployment.md`](08-vercel-production-deployment.md)。

## 12. 规划阶段与新增发布波次边界

原规划阶段没有修改业务源码、schema、migration 或依赖，也没有执行 Git；其后 FND-001～QA-003 已完成实现与验证。本次 2026-08-17 修订只更新规划和运行指南，没有替 `BRAND-001`、`VERCEL-001`、`QA-004` 或 `RELEASE-001` 修改业务源码、Vercel 配置、数据库连接契约或外部平台状态。
