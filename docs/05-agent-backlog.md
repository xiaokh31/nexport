# 开发 Agent 任务清单

状态：可领取，代码尚未实施  
日期：2026-08-13

## 1. 使用规则

- 开发 Agent 必须先阅读 `docs/README.md` 和其余四份规划文档。
- 一次只执行一个任务或文档明确允许的同波次任务组；不得把整个 backlog 当作一次无检查的大改。
- 每次开始时声明任务 ID、依赖是否完成、预计触碰文件和本次不处理的内容。
- 公司身份内容保持占位，AGPL-3.0 保留，不执行 Git 操作。
- 任务完成时报告：实际改动、偏离计划的原因、局部验证、剩余风险。
- 共享热点 `schema.prisma`、`0_init/migration.sql`、`package.json`、`site-config.ts`、三份 locale 由同一集成 Agent 串行维护。

验证分为三级：L0 是不依赖 `node_modules` 的 `rg`、JSON/Markdown/静态结构检查，每个任务必须执行；L1 是 Prisma、lint、typecheck 等依赖命令，依赖尚未重装时登记到 QA-001，不阻塞该任务移交；L2 是数据库、API 和浏览器验收，由 QA-002/003 执行。任务卡中的运行态验收默认属于 L2，不能因当下没有依赖而删除。

L0 的标准做法：用 `rg` 验证删除项和旧 key 无残留；用 Node 内置 `JSON.parse` 检查 `package.json`、manifest 和三份 locale；检查 schema 与 baseline 的模型/枚举名称集合；检查 Markdown 相对链接存在。L1 统一使用 `pnpm prisma:validate`、`pnpm lint`、`pnpm typecheck`，涉及构建时再运行 `pnpm build`。具体任务出现更严格命令时，以任务卡为准。

复杂度只表示相对工作量：S、M、L、XL，不是工期承诺。优先级表示发布风险：P0 是安全、数据或发布阻断，P1 是 MVP 必需产品/视觉交付；依赖顺序永远优先于 P0/P1 标签，不能跳过前置任务。

## 2. 任务总览

| ID | 优先级 | 复杂度 | 依赖 | 交付结果 |
|---|---|---:|---|---|
| FND-001 | P0 | M | 无 | 工具链、环境变量和运行契约就绪 |
| CLN-001 | P0 | S | FND-001 | 中加海运方案全链删除 |
| CLN-002 | P0 | L | FND-001 | 扫码对账全链删除 |
| CLN-003 | P0 | M | FND-001 | 伪 2FA 全链删除 |
| CLN-004 | P0 | M | FND-001 | 重复 Contact 数据链删除 |
| DATA-001 | P0 | L | CLN-001~004 | 服务枚举与 Quote 契约修正 |
| DATA-002 | P0 | L | DATA-001 | Article/索引与最终 baseline 定稿 |
| TEST-001 | P0 | L | DATA-002 | 测试数据库、fixtures 与外部服务替身 |
| SEC-001 | P0 | L | CLN-003、TEST-001 | 演示登录、OAuth、登录历史与邮件安全修复 |
| SEC-002 | P0 | L | DATA-002、TEST-001 | 服务端 CAPTCHA fail-closed |
| SEC-003 | P0 | M | DATA-001、TEST-001 | 询价所有权与注册自动认领漏洞修复 |
| RBAC-001 | P0 | XL | CLN-002、DATA-002、TEST-001、SEC-001 | 统一能力授权与管理员初始化 |
| SAFE-001 | P0 | L | DATA-002、TEST-001 | 新闻/Page 安全内容管线 |
| NOTIF-001 | P0 | XL | RBAC-001、DATA-002、SEC-001 | 通知、邮件 outbox 与偏好闭环 |
| AUTH-001 | P1 | L | SEC-001~003、NOTIF-001 | 邮箱验证与安全注册闭环 |
| QUOTE-001 | P0 | XL | DATA-001、SEC-002~003、AUTH-001、RBAC-001、NOTIF-001 | 询价—报价—通知端到端修复 |
| ARTICLE-001 | P1 | XL | RBAC-001、SAFE-001、DATA-002 | 文章编辑与发布闭环 |
| SEO-001 | P1 | L | ARTICLE-001、SAFE-001 | 新闻 SSR、metadata、JSON-LD、sitemap |
| UI-001 | P1 | L | DATA-002、RBAC-001 | 海外仓视觉 token 与全局框架 |
| UI-002 | P1 | XL | UI-001、CLN-001、QUOTE-001、SEO-001 | 首页与解决方案重构 |
| UI-003 | P1 | L | UI-001、QUOTE-001、SEO-001 | 询价与新闻页面重构 |
| UI-004 | P1 | XL | UI-001、AUTH-001、RBAC-001、NOTIF-001、QUOTE-001、ARTICLE-001 | 登录、用户中心与后台重构 |
| HYG-001 | P1 | L | 所有功能/UI任务 | 依赖、死代码、旧资产和配置清理 |
| DOC-001 | P1 | M | HYG-001 | README、环境与运维文档定稿 |
| QA-001 | P0 | L | 所有实施任务 | 重装依赖和静态质量门禁 |
| QA-002 | P0 | XL | QA-001、TEST-001 | 数据、安全、权限和核心流程测试 |
| QA-003 | P1 | L | QA-002、UI-002~004 | 浏览器、响应式与无障碍验收 |

## 3. Foundation 与删除任务

### FND-001：工具链和配置契约

目标：让后续 Agent 使用同一 Node、脚本、URL 和环境变量约定，但本任务不安装依赖。

主要范围：

- `package.json`：Node `>=20.9.0`、`packageManager: pnpm@10.27.0`、`license: AGPL-3.0-only`、`typecheck`、`prisma:validate`，删除 `build_comment`。
- `.gitignore`：保留 `.codex-local/` 忽略，加入 `!.env.example`。
- 新增 `.env.example`，只写不可用占位。
- 只保留 `NEXT_PUBLIC_SITE_URL`；生产要求绝对 HTTPS，开发允许 localhost。
- 建立集中环境读取/校验模块；可选服务与必需服务区分构建期和运行期。

验收：

- package JSON 与 env 示例可解析。
- 构建不会隐式运行 `prisma migrate deploy`。
- 静态确认可选 provider 使用条件注册；构建和运行态验证统一推迟到 QA-001。
- `LICENSE` 内容未修改。

### CLN-001：删除“中国到加拿大海运/集运”

主要范围：

- 删除 `site-config.ts` 的 `chinaToCanada`。
- 删除三份 locale 的导航、表单和方案节点。
- 删除 `public/images/services/China-Canada-Consolidation.jpg`。
- 清理因此闲置的图标 import、首页/详情条件和旧 URL 引用。

验收：

- `rg -i 'china.?to.?canada|chinaToCanada|china-to-canada|中加.*集运|中国.*加拿大.*海运'` 在业务文件与资产名中无命中。
- Header、首页、方案页、询价选项和 sitemap 只生成八个保留方案。
- `/solutions/china-to-canada` 返回 404。

### CLN-002：删除扫码对账

主要范围：

- 删除 `src/app/admin/sku-scan/page.tsx`。
- 删除 `src/app/api/admin/sku-scan/route.ts`。
- 删除 `src/components/admin/html5-qrcode-plugin.tsx` 及导出。
- 删除 sidebar、权限模块、路径映射和三语 `admin.skuScan`。
- 删除 Prisma 两模型、两枚举及 baseline 对应 SQL。
- 从 package 移除 `html5-qrcode`、`xlsx`，lockfile 留待 QA-001 重新生成。

验收：

- 全仓无 `sku-scan`、`skuScan`、`ScanContainer`、`SkuScan`、`ScanMode`、`ScanStatus`、`html5-qrcode`、`xlsx` 业务引用。
- 任何角色都看不到或访问不到扫码路由/API。
- Prisma schema 与 baseline 都不包含扫码结构。

### CLN-003：删除伪 2FA

主要范围：

- 删除 `/api/user/2fa`。
- 删除用户设置页全部 2FA 状态、请求、对话框和 UI。
- 删除用户设置 API 的 `twoFactorEnabled` 输出。
- 删除 User 两个 2FA 字段及 baseline 列。
- 删除三语 2FA 文案、`qrcode`、`@types/qrcode`。

验收：

- 全仓无 2FA API、设置控件、字段、文案或二维码依赖。
- 登录/设置页面不会暗示系统具备 2FA。
- 不用另一个临时六位数字判断替代。

### CLN-004：删除重复 Contact 数据链

前提：按项目简报默认决策，业务联系由询价表单承接；`/contact` 页面本身保留。

主要范围：

- 删除未被页面使用的 `ContactForm` 与 `/api/contact`。
- 删除 Contact/ContactStatus、User relation 和 baseline SQL。
- 删除注册自动关联、后台统计、validation、forms export、邮件模板中的 Contact 耦合。
- 将后台统计/文案改为真实的询价或通知指标。

验收：

- `/contact` 仍能展示公司联系占位和询价表单。
- 全仓无 Prisma Contact 类型、`/api/contact` 或历史认领逻辑。
- 后台没有名为“消息”但实际指 Contact 的假指标。

## 4. 数据契约任务

### DATA-001：统一服务枚举与 Quote 模型

主要范围：

- 建立九个稳定 ServiceType；`solutionConfigs` 显式绑定。
- 让表单、Zod、API、admin/user label map 共用同一来源。
- 将报价金额改为 Decimal + 可验证的三字母 currency，不设置公司相关默认币种。
- 区分客户备注与内部备注；增加 Quote 常用组合索引。
- 将重量、长宽高与单位分离；件数/箱数/托盘数使用非负整数，值与单位成对校验。
- 增加 UUID `submissionKey`、按技术计划规范化的 `submissionFingerprint`、不可预测的公开 `reference` 和含 reason 的 QuoteEvent 状态审计/幂等结构。
- 增加 Quote 软删除字段；只有 ADMIN 可软删除仍为 PENDING 的重复/测试/无效记录。
- 修正服务端错误码，未知枚举返回 400。

验收：

- 八个方案和 OTHER 均能通过 Zod 与 Prisma 类型。
- 仓库中没有 `key.toUpperCase()` 或强制 cast 维持 serviceType。
- 报价金额可准确保存小数，currency 与金额成对验证。
- 重量与尺寸使用 KG/LB、CM/IN 受控单位，后台不再解析自由文本。
- 相同 submissionKey 或状态 requestKey 重试不重复写入；CAPTCHA token 不进入指纹，reference 符合 `Q-YYYYMMDD-XXXXXXXX`。
- 转换与字段权限逐项符合技术计划 3.3 的白名单；CLOSED 不可重开，矩阵外转换返回 409。
- 用户 API 不会返回内部备注。

### DATA-002：文章结构、索引和 baseline 定稿

主要范围：

- Article 增加 `authorId`、作者快照、SEO 字段、封面 alt。
- 定义稳定 slug 和首次发布时间语义。
- 删除 `User.newsUpdates`，将 `quoteUpdates` 重命名为 `quoteEmailUpdates`。
- Notification/LoginHistory/Article 的组合索引按技术计划建立。
- 增加 PostgreSQL `RateLimitBucket` 及唯一约束/过期索引，调用方不直接依赖具体存储。
- Notification 增加 `(userId, eventKey)` 唯一约束，报价通知由 QuoteEvent id 生成 eventKey。
- 增加 EmailOutbox 的投递状态/租约/稳定幂等键结构，以及 NotificationBroadcast 的 requestKey/payload 指纹结构。
- 删除重复 slug 普通索引。
- 将 CLN/DATA 的最终结构合并进唯一 `0_init`。

验收：

- `prisma format`、`prisma validate`、`prisma generate` 可通过。
- schema 与 baseline 字段、enum、索引、外键一致。
- 新 baseline 只包含目标模型，不含 Scan、2FA、Contact，并包含 QuoteEvent、EmailOutbox、NotificationBroadcast 与 RateLimitBucket。

### TEST-001：测试基础设施

主要范围：

- 固定 Vitest 作为单元/集成测试，Playwright 作为关键浏览器路径测试。
- 提供隔离 PostgreSQL 的测试启动方式，推荐独立 compose 文件；测试库名和端口不得指向开发/生产库。
- 新增 `test`、`test:integration`、`test:e2e` 脚本及 `DATABASE_URL_TEST` 文档。
- 建立 ADMIN、STAFF（有/无文章权限）、FINANCE、WAREHOUSE、CUSTOMER、PARTNER fixtures 和测试数据清理。
- CAPTCHA、邮件、时间与随机 reference 通过依赖注入替身；邮件替身必须记录 payload、稳定 idempotency key 和模拟的成功/超时/4xx/5xx，只有 `NODE_ENV=test` 可选用。
- 提供一条从空库部署 `0_init`、加载 fixtures、运行测试并清理的标准命令。

验收：

- 测试命令会拒绝非测试数据库名称/标记，不能误清开发或生产数据。
- fixtures 无默认生产密码，不进入 seed 或运行时路径。
- 外部服务替身不依赖网络，生产构建无法导入测试 bypass。

## 5. 安全与授权任务

### SEC-001：认证表面和辅助服务加固

主要范围：

- 删除 demo credentials。
- Google provider 按完整 env 条件注册，删除危险邮箱自动链接；UI 同步隐藏。
- 邮箱统一 trim/lowercase，凭证错误不枚举账号存在性。
- 删除 login-history 未认证 POST，只保留 auth event 内部写入。
- 修复 `email.ts`：删除域名管理副作用，HTML escape 用户输入，清理 SendGrid 注释空壳。

验收：

- demo 登录失败且不会创建 session/历史记录。
- Google env 缺失时登录页无入口、应用可启动。
- 任意外部 POST 不能写登录历史。
- 邮件测试输入中的 HTML 被转义；发送路径只调用发送 API。

### SEC-002：服务端 CAPTCHA fail-closed

主要范围：

- 新建共享 server verifier 与清晰结果类型。
- 登录 credentials 增加 token 并在验密前校验。
- 注册在写库前校验。
- Quote 入口由 QUOTE-001 接入同一 verifier；本任务先提供接口和认证接入。
- 删除数学验证码、自动 success hook 和可绕开的验证流程。

验收：

- token 缺失、伪造、过期、secret 缺失、provider 异常都拒绝登录/注册。
- 直接调用 register/credentials 不能绕过。
- 官方测试密钥或 mock 只在测试依赖注入中生效，生产无通用 bypass。
- 默认限流窗口、HMAC key 与可信代理层数按技术计划执行；不保存原始 IP/邮箱。

### SEC-003：修复询价所有权与历史认领

主要范围：

- 游客提交 Quote 始终 `userId=null`。
- 登录提交只绑定 session id，不信任 body 的 userId/email 所有权。
- 用户 Quote 查询只按当前 `userId`。
- 注册删除历史 Quote/Contact 自动关联。
- 如保留认领入口，当前版本明确返回未实现，不做邮箱字符串匹配。

验收：

- 新注册成历史询价相同邮箱后列表为空。
- 用户 A 无法通过参数、邮箱或直接 API 读用户 B 数据。
- 登录用户新提交记录能出现在自己的列表。

### RBAC-001：统一能力授权与管理员初始化

主要范围：

- 建立 `requireCapability` 和唯一 capability matrix。
- API 读取数据库中当前角色/权限，前端菜单从同一矩阵派生。
- 修复 articles、quotes、pages、notifications、users、settings、stats 的权限漂移。
- `STAFF + canManageArticles` 完整可管理文章；FINANCE 按矩阵处理报价；WAREHOUSE 不进入后台。
- 防止降级/删除最后一个 ADMIN。
- 提供幂等 `admin:promote --email` 一类脚本，不含默认密码。

验收：

- 每项能力至少有允许和拒绝的 API 测试。
- 撤销权限后下一次敏感请求立即 403，不等待 JWT 自然过期。
- 菜单、落地页与 API 一致，不出现无限 spinner。
- 新数据库可安全建立首个管理员，无硬编码账户。

### SAFE-001：安全内容管线

主要范围：

- Article 和 Page 统一使用 Markdown，禁用原始 HTML。
- 建立共享 server renderer 和预览组件。
- 限制链接协议、图片来源、标题层级、表格/长链接布局。
- 管理 API 对长度和内容格式执行 Zod 校验。
- 增加 CSP 与现有安全 header 的合理配置，不依赖 `X-XSS-Protection`。

验收：

- `<script>`、`onerror`、`javascript:`、危险 iframe/style 测试载荷不执行。
- 新闻、privacy、terms 不再直接渲染未经净化数据库 HTML。
- 预览与公开结果一致。

## 6. 核心业务任务

### NOTIF-001：通知服务和偏好闭环

主要范围：

- 把通知创建、文案、偏好、站内 link 校验和邮件 outbox 生产集中为 domain service。
- 状态事务内原子写 QuoteEvent、账户站内通知和符合偏好的 EmailOutbox；worker/受保护 cron 用租约领取、退避重试并记录 provider message id。
- Resend 使用由 domain event + recipient 派生的稳定 idempotency key；模糊投递超过 provider 24 小时幂等窗口转人工复核，不盲目重发。
- 仅 `userId != null` 的报价创建站内通知；账户报价邮件需要已验证邮箱且满足 `emailNotifications && quoteEmailUpdates`。必要认证/安全邮件绕过这些偏好，但仍走 outbox。
- 管理广播只允许 ADMIN，MVP 仅站内；请求必须带 UUID requestKey，按 payload 指纹幂等。“消息管理”改成准确的“通知管理”。
- 服务端验证 NotificationType、目标用户、link 和分页上限。

验收：

- 账户 Quote 站内通知始终创建；匿名 Quote 不创建站内/邮件通知；报价邮件仅在邮箱已验证且两个开关均为 true 时入队，验证邮件不受偏好关闭影响。
- 业务事务提交而 provider 失败时状态与站内通知不丢；worker 重试使用同一 payload/idempotency key，不重复投递。
- 用户只能读写自己的通知；管理员广播有接收人数与结果，同一 requestKey 重试不重复广播，payload 改变返回 409。
- 覆盖 worker 崩溃恢复、锁超时、永久失败、24 小时后人工复核与并发领取测试。

### AUTH-001：邮箱验证闭环

主要范围：

- 利用 VerificationToken/emailVerified 建立一次性、过期、不可重放的验证流程。
- 注册成功通过 EmailOutbox 发送验证邮件；链接使用统一站点 URL，稳定幂等键由验证 token 记录派生。
- 验证页处理成功、过期、已使用和无效 token。
- Credentials 用户验证邮箱前不能建立 session；提供重新发送验证邮件的限流入口。

验收：

- token 不明文长期存储，过期/重复使用失败。
- 邮件发送失败有可重试路径，不重复创建账户或 outbox 项；用户关闭邮件偏好也不阻止验证邮件。
- emailVerified 只由服务端验证动作写入。

### QUOTE-001：询价—报价—通知端到端

主要范围：

- 表单使用共享 serviceType，支持方案 query 预选。
- 接入 server CAPTCHA、限流、长度与单位校验。
- 显示字段错误、服务错误、成功编号、重复提交保护和可恢复状态。
- ADMIN/STAFF/FINANCE 严格按技术计划 3.3 的字段与转换白名单读取更新；校验回退、直接关闭、CLOSED 终态和软删除条件。
- 用户列表只显示自身记录、客户可见备注和金额/currency。
- 状态真实变化时通过 Notification service 通知一次。

验收：

- 九个 serviceType 分别用已登录用户完成“表单 → API → DB → admin → user → notification”；另测匿名询价只入库且不进入任何用户中心/通知。
- 无效类型/金额/状态返回明确 4xx。
- 相同状态/相同 requestKey 重复 PATCH 不重复 QuoteEvent、站内通知或邮件 outbox。
- 邮件未配置或发送失败不丢失已保存询价，并有可观察错误。

### ARTICLE-001：文章编辑与发布闭环

主要范围：

- 新建/编辑/API 共用 Article Zod schema，不再忽略表单字段。
- slug 创建时唯一、冲突 409、发布后稳定。
- 首次发布写 `publishedAt`，后续编辑不重置。
- 完成 excerpt、tags、cover/alt、SEO 字段、分类、状态和作者关系。
- 预览使用受保护路由与 SAFE-001 渲染器。
- ADMIN 和授权 STAFF 的 CRUD/发布能力一致。

验收：

- 草稿、预览、发布、编辑、归档全流程可用。
- 标题修改不改已发布 slug。
- 未授权用户所有写操作 403。
- API 错误区分校验、冲突、未找到和服务异常。

### SEO-001：新闻与页面 SEO

主要范围：

- 新闻列表/详情改为 server component，公开只读 PUBLISHED。
- 文章 `generateMetadata`、canonical、Open Graph、Article JSON-LD。
- sitemap 查询已发布文章并使用真实时间。
- 方案页增加独立 metadata、breadcrumb/service schema（仅真实内容）。
- 移除不存在 locale 路由的 hreflang；占位公司信息时不输出 LocalBusiness。
- 首页加入最新文章，方案详情加入相关文章。

验收：

- 直接请求 HTML 已包含文章标题和正文。
- 草稿/归档公开 404；发布文章进入 sitemap。
- canonical 与实际 URL 一致，无 `/zh`、`/en`、`/fr` 假 alternates。
- 结构化数据通过 JSON 解析且不含占位企业事实。

## 7. 视觉任务

### UI-001：设计 token、字体与全局框架

主要范围：

- 实现 Dock Navy/Steel Blue/Concrete/Signal Amber/Pallet Kraft/Paper White token。
- 自托管或稳定 fallback 的标题、正文、utility 字体。
- 重构 `globals.css`、Root Layout、Header、Footer、按钮、表单焦点和后台 sidebar token。
- Header 只保留一个语言切换器，增加 skip link、移动 Sheet title 和 accessible name。

验收：

- 不再使用默认黑白渐变模板作为公开站视觉。
- 键盘焦点清晰，颜色对比达目标，Header 在 320–1920 宽度可用。
- 公司占位内容未被修改。

### UI-002：首页与解决方案

按 `03-product-design-spec.md` 实现 Hero、作业流程轨道、方案分组、能力说明、最新文章与 CTA；重做方案总览和八个详情模板。

验收：

- Hero 表达真实仓储流程，不显示假统计。
- 严格使用设计规格 12.1 的中性占位/隐藏规则，不用未确认公司事实完成版面。
- 所有方案入口可点击并能预选询价。
- 装卸口/货位坐标只用于真实流程，不堆装饰编号。
- 旧 `/services` 站内入口清零。

### UI-003：询价与新闻

主要范围：`/contact`、QuoteForm、news list/detail、错误/空/加载/成功状态和文章排版。

验收：

- 表单错误/成功通过 `aria-live`，失败保留输入。
- 新闻筛选有正确语义；正文图片、表格、长链接移动端不溢出。
- 不使用现有商标拼图或图片内嵌中文作为最终信息载体。

### UI-004：登录、用户中心与后台

主要范围：auth 页面、用户 layout/dashboard/quotes/notifications/settings、admin layout/sidebar/tables/dialogs。

验收：

- Dashboard 只显示真实询价和通知，不出现订单/库存假数据。
- 删除无行为头像上传、预览或安全设置控件。
- 桌面/移动表格可读，空状态给出下一步，危险操作需确认。
- 权限拒绝有明确结果，不以永久 spinner 掩盖。

## 8. 项目卫生与文档任务

### HYG-001：依赖、死代码、资产和配置清理

主要范围：

- 删除 `src/lib/cms/**` 与 Sanity/Contentful/next-sanity。
- 删除 `next-intl`、未使用 Speed Insights、已删除功能依赖。
- 确认并删除冗余 `@types/bcryptjs`。
- 清理 CMS remotePatterns、`@radix-ui/react-icons` 优化项、旧 `/services`、默认 SVG、未用类型/组件/配置。
- 删除错误 AWS/承运商拼图和内嵌文字服务图片；素材缺失时使用占位。
- 统一代码格式，删除无效注释、`as any`、吞异常和未使用 import。

验收：

- 每个 package 都有实际 import 或明确构建用途。
- 全仓无已删除模块/品牌/旧 URL/失效资产引用。
- 不存在指向缺失 `og-image`、partners 或 CMS 域名的配置。

### DOC-001：运行与维护文档

主要范围：

- 完成根 README：环境、安装、开发、Prisma、质量门禁、管理员初始化、部署注意事项。
- `.env.example` 与代码保持同步。
- 记录 serviceType、capability matrix、文章发布和公司资料上线清单。
- 明确 AGPL-3.0 网络部署义务由项目使用方审核，本任务不修改许可证正文。

验收：新开发者仅按 README 可在空数据库启动项目，并知道哪些公司配置仍是阻塞项。

## 9. 最终验证任务

### QA-001：重新安装与静态门禁

执行顺序：

1. 删除功能与 package 调整完成后运行 `pnpm install` 更新 lockfile。
2. 再运行 `pnpm install --frozen-lockfile`。
3. 启动 TEST-001 的隔离 PostgreSQL，并只部署 `0_init`。
4. `pnpm prisma:generate`。
5. `pnpm prisma:validate`。
6. `pnpm lint`。
7. `pnpm typecheck`。
8. 使用测试 `DATABASE_URL` 执行 `pnpm build`。

验收：全部退出码为 0；不得通过关闭规则或忽略错误达成。记录 Node/pnpm 版本和构建所需的非秘密环境变量。

### QA-002：数据库、安全与核心流程

主要范围：空 PostgreSQL baseline、认证负向测试、所有服务类型、数据隔离、RBAC、XSS、文章发布和通知幂等。

最低场景：

- demo、无 CAPTCHA、假 CAPTCHA 均失败。
- 用户 A/B 的 Quote/Notification 隔离。
- ADMIN/STAFF/FINANCE/WAREHOUSE/CUSTOMER/PARTNER 能力矩阵。
- 最后一个 ADMIN 保护与撤权即时生效。
- 九个服务类型端到端。
- 恶意 Markdown/HTML 不执行。
- 草稿 404、发布文章进入 sitemap、重复状态不重复通知。

验收：测试可重复执行，不依赖真实外部邮件或 CAPTCHA；测试替身不能进入生产路径。

### QA-003：浏览器、响应式与无障碍

使用浏览器自动化或明确的人工记录覆盖：

- 320、375、768、1024、1440、1920。
- Header/移动菜单、语言切换、询价、登录注册、用户中心、报价、通知、文章发布。
- 键盘、可见焦点、200% 缩放、长法文、reduced-motion、读屏标签。
- 无 console/hydration error、404 图片、横向滚动和不可恢复表单状态。

验收：发现的问题回到对应任务修复，QA 任务本身不以跳过或备注“已知问题”宣布完成。

## 10. 推荐执行批次

为减少上下文和冲突，推荐依次交给开发 Agent：

1. **基础清理批次**：FND-001 → CLN-001 → CLN-002 → CLN-003 → CLN-004。
2. **数据与安全批次**：DATA-001 → DATA-002 → TEST-001 → SEC-001 → SEC-002 → SEC-003 → RBAC-001 → SAFE-001。
3. **业务批次**：NOTIF-001 → AUTH-001 → QUOTE-001；ARTICLE-001 → SEO-001 可作为另一条并行支线。
4. **视觉批次**：UI-001 → UI-002；UI-003 与 UI-004 在 UI-001 后按文件分工。
5. **收尾批次**：HYG-001 → DOC-001 → QA-001 → QA-002 → QA-003。

## 11. 可直接复用的 Agent 提示词模板

```text
阅读 docs/README.md 及 01–05 全部规划文档。只实施任务 [TASK-ID]，先检查其依赖并声明文件范围。不要修改未确定的公司信息，不要修改 AGPL-3.0 LICENSE，不执行任何 Git 操作。使用 apply_patch 修改文件，保护用户已有改动。完成后执行任务规定的局部校验，报告改动、验证结果、未解决项；不要顺手扩展到下一个任务。
```
