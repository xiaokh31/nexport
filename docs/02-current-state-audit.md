# 当前状态审计

审计日期：2026-08-13  
审计方式：只读检查源码、配置、Prisma schema 与单一 baseline migration；未安装依赖、未连接数据库、未运行应用、未执行 Git

> 历史快照：本文件保留 2026-08-13 开发前审计证据，所列故障已由 FND-001～QA-003 处理，完成状态以 [`06-task-progress.md`](06-task-progress.md) 为准。2026-08-17 新确认公司法定/展示名称为 `ZNB Logistics Inc.`、网站简称为 `ZNB`、生产平台为 Vercel；源码仍待 `BRAND-001` 与 `VERCEL-001` 接入，因此下文当时的占位描述不代表当前产品决策。

## 1. 结论摘要

项目已有企业展示、认证、用户中心、询价、报价、通知、角色、文章和固定页面管理的完整骨架，可以作为新站基础。当前不适合直接进入视觉改造：询价、数据归属、CAPTCHA、伪 2FA、授权和富文本渲染存在阻断级问题，必须先修复业务与安全契约。

全项目未发现旧公司名称、域名等身份信息回归；现有 `Company Name`、`example.com` 等为有意保留的中性占位。`LICENSE` 是完整 GNU AGPL v3 文本。

## 2. 现有模块地图

| 模块 | 页面/组件 | API | 数据/配置 |
|---|---|---|---|
| 企业展示 | `src/app/page.tsx`、`about`、`solutions/**`、`contact`、`src/components/marketing/**` | 无专用 API | `src/config/site-config.ts`、三份语言 JSON |
| 询价与报价 | `quote-form.tsx`、`admin/quotes`、`user/quotes` | `/api/quote`、`/api/admin/quotes`、`/api/user/quotes` | `Quote`、`ServiceType`、`QuoteStatus` |
| 认证 | `login/**`、`register/**` | NextAuth、register、verify-captcha | `User` 与 NextAuth 数据表 |
| 用户中心 | `dashboard`、`user/**` | profile、password、settings、login-history | `User`、`LoginHistory` |
| 通知 | 通知铃、`user/notifications`、`admin/messages` | `/api/notifications` | `Notification` 与用户偏好字段 |
| 角色与后台 | `admin/layout`、guard、sidebar、users | 各后台 API 自行判断角色 | `UserRole`、`canManageArticles`、`permissions.ts` |
| 新闻 | `news/**`、`admin/articles/**` | public/admin article API | `Article` |
| 固定页面 | `privacy`、`terms`、`admin/pages` | public/admin page API | `Page` |
| 扫码对账 | `admin/sku-scan`、二维码组件 | `/api/admin/sku-scan` | `ScanContainer`、`SkuScan` |

当前数据库基线包含 13 个模型与 9 个枚举。`prisma/schema.prisma` 和 `prisma/migrations/0_init/migration.sql` 对扫码与 2FA 的旧结构仍保持一致，因此后续必须同时修改二者。

## 3. P0 阻断问题

### P0-01：多数解决方案无法提交询价

`src/components/forms/quote-form.tsx` 用 `key.toUpperCase()` 生成值，例如 `fbaLastMile → FBALASTMILE`，但 `src/lib/validations.ts` 和 Prisma 只接受 `FBA | DROPSHIPPING | RETURNS | OTHER`。当前配置中的大多数选项会在客户端校验阶段失败。

影响范围：

- `src/config/site-config.ts`
- `src/components/forms/quote-form.tsx`
- `src/lib/validations.ts`
- `src/app/api/quote/route.ts`
- `src/app/admin/quotes/page.tsx`
- `src/app/user/quotes/page.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/0_init/migration.sql`
- 三份语言 JSON

处理原则：用显式 `serviceType` 配置和共享常量作为唯一来源，不再从展示 key 推导数据库值。

### P0-02：未验证邮箱可造成询价错误归属和隐私泄露

三条路径共同构成风险：

- `/api/quote` 在访客未登录时按表单邮箱查找用户并写入该用户 `userId`。
- `/api/auth/register` 注册后自动认领同邮箱历史 Quote 和 Contact，但没有邮箱验证。
- `/api/user/quotes` 用 `userId OR email` 查询，刚注册一个未验证邮箱即可看到该邮箱的历史询价。

处理原则：账户数据只按 session `userId` 查询；访客询价保持 `userId = null`；删除注册自动认领。未来认领必须建立在已验证邮箱或一次性授权上。

### P0-03：CAPTCHA 可被直接绕过

- 登录和注册只保存客户端布尔状态，没有把 token 传给服务端业务入口。
- Credentials provider 不接收 CAPTCHA token。
- 注册 API 不校验 CAPTCHA。
- `/api/auth/verify-captcha` 在缺少 `RECAPTCHA_SECRET_KEY` 时返回成功。
- `SimpleMathCaptcha` 在浏览器本地计算，不能证明服务端请求来自真人。
- `useCaptcha()` 的服务端验证封装没有被实际业务流程使用。

处理原则：服务端 fail closed。token 缺失、密钥缺失、验证失败、上游异常均不可创建账户、完成登录或提交受保护的公共表单；删除数学验证码和所有自动成功分支。

### P0-04：现有 2FA 是伪安全功能

`src/app/api/user/2fa/route.ts` 使用 `Math.random()` 生成所谓 secret，只检查输入是否为六位数字，不计算或验证 TOTP；任意六位数字都可启用或停用，登录过程也从未检查 2FA。

处理原则：完整删除 API、设置 UI、用户字段、翻译、`qrcode` 依赖和 baseline 字段。真实 2FA 必须另立项目，使用成熟 TOTP 库、加密 secret、恢复码和登录挑战流程。

### P0-05：演示登录与账户链接策略不安全

`src/lib/auth.ts` 在数据库找不到用户时接受 `demo@example.com / demo123`，且 Google provider 开启 `allowDangerousEmailAccountLinking`。第三方 provider 又被无条件配置，即使环境变量为空也会出现在代码路径中。

处理原则：删除演示回退；仅在完整配置时启用第三方 provider；移除危险邮箱自动链接；明确凭证用户与 OAuth 用户的安全合并流程。

### P0-06：RBAC 的菜单与 API 已发生漂移

已确认的不一致包括：

- `STAFF + canManageArticles` 能看到文章管理，但所有文章 API 只允许 ADMIN。
- STAFF 的报价 PATCH 被允许，GET 被拒绝，且前端权限表没有 `quotes`。
- STAFF、WAREHOUSE、FINANCE 能看到“消息管理”，其依赖的用户列表和通知发送 API 只允许 ADMIN。
- Page API 允许 STAFF 读写，而前端权限表把页面模块作为管理员专属。
- `AdminGuard` 是客户端守卫，不能代替服务端授权。
- JWT 中缓存的角色与文章权限不会按注释所称即时刷新，撤权后的旧会话可能继续使用旧声明。

处理原则：创建服务端 `requireCapability` 一类的统一入口；菜单由同一能力矩阵派生，但 API 每次操作必须独立授权。对敏感角色变更明确 session 失效或服务端重新查询策略。

### P0-07：文章和固定页面存在存储型 XSS 面

文章详情、隐私政策和服务条款把数据库 HTML 直接传给 `dangerouslySetInnerHTML`，写入 API 没有净化或可信编辑器约束。获得内容编辑权限的账户或被劫持账户可以写入脚本/危险属性。

相关文件：

- `src/app/news/[slug]/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/api/admin/articles/**`
- `src/app/api/admin/pages/**`

处理原则：定义允许的 HTML 白名单，服务端写入时净化，输出端保持纵深防御；预览与公开渲染使用同一管道。补充 CSP 任务，不能把 `X-XSS-Protection` 当作现代防线。

### P0-08：登录历史存在未认证写入口

`src/app/api/user/login-history/route.ts` 的 POST 接受任意 `userId`，不检查 session，可伪造登录记录。它还会在数据库异常时返回“成功但未记录”。

处理原则：删除公共 POST；只允许认证系统内部事件写入；数据库失败需要可观察但不得伪报成功。GET 仍只读当前 session 用户。

## 4. P1 功能与 SEO 问题

### 4.1 询价—报价—通知未完整闭环

- 表单失败只写控制台，没有用户可见的错误与重试提示。
- 方案详情进入询价不能预选当前服务。
- Zod 输入错误被笼统返回 500，而不是 400/422。
- STAFF 无法完整读取并处理报价。
- 相同状态重复 PATCH 会重复生成通知。
- `emailNotifications`、`quoteUpdates`、`newsUpdates` 只保存，不控制实际发送行为。
- 通知类型缺少服务端枚举校验，通知写入分散在业务 API 中。

### 4.2 新闻发布链路与表单不一致

- 新建页提交 slug 和 excerpt，API 忽略并自行生成。
- 创建时直接选择 PUBLISHED 不写 `publishedAt`。
- 标题修改会自动改 slug，破坏已收录 URL。
- slug 冲突、状态、分类、标签缺少可靠 Zod 校验和友好错误。
- “预览”按钮没有真实功能；编辑预览与公开渲染不一致。

### 4.3 公开新闻不具备完整 SEO 输出

- 新闻列表和详情均用客户端 `useEffect` fetch，初始 HTML 主要是加载状态。
- 文章没有 `generateMetadata`、独立 canonical、Open Graph 和 Article JSON-LD。
- sitemap 不包含已发布文章，并把静态页 `lastModified` 每次都设为当前时间。
- 根 metadata 声明 `/zh`、`/en`、`/fr` hreflang，但这些路由不存在；`<html lang>` 固定为中文。
- 新闻分页不是可抓取链接；首页与方案页没有相关新闻内部链接。
- 占位公司资料正在作为 Organization/LocalBusiness 结构化实体输出。

处理原则：公开内容改为服务端读取；发布状态和 `publishedAt` 控制可见性；生成动态 metadata、JSON-LD 和 sitemap；公司信息确定前暂停 LocalBusiness；未建设真实语言路由前删除虚假 alternates。

### 4.4 当前首页与方案入口有明显交互错误

- 方案组件注释称展示 4 个，实际 `slice(0, 7)`，其余条目被无解释隐藏。
- 方案卡片不可点击，详情链接被注释。
- Hero 的服务入口仍指向旧 `/services` 兼容路由。
- 部分方案图标未映射而退化为通用图标。
- 统计区只显示固定 `0`，不应作为企业能力证明。

### 4.5 用户中心含假功能和空壳交互

- `src/app/dashboard/page.tsx` 展示项目并不存在的订单、库存与固定数字。
- 用户头像“上传”按钮没有行为。
- 设置页展示未实际执行的通知偏好和伪 2FA。

处理原则：仪表盘只展示真实询价、待处理报价和未读通知；无实现的按钮删除或明确禁用，不用静态数字模拟功能。

## 5. 明确删除面

### 5.1 扫码对账

- `src/app/admin/sku-scan/page.tsx`
- `src/app/api/admin/sku-scan/route.ts`
- `src/components/admin/html5-qrcode-plugin.tsx`
- admin sidebar、组件导出、权限模块与路径
- 三份语言文件中的 `admin.skuScan`
- Prisma 的 `ScanContainer`、`SkuScan`、`ScanStatus`、`ScanMode`
- baseline SQL 中对应 enum、表、索引、外键
- `html5-qrcode`、`xlsx`

### 5.2 中国到加拿大海运/集运方案

- `src/config/site-config.ts` 中 `chinaToCanada`
- 三份语言文件中的导航、表单和解决方案内容
- `public/images/services/China-Canada-Consolidation.jpg`
- 删除后由配置派生的 Header、首页、方案、询价和 sitemap 入口都应消失
- 旧 `/solutions/china-to-canada` 允许 404；新项目无旧站 SEO 迁移要求时无需重定向

### 5.3 伪 2FA

- `/api/user/2fa`
- 设置页 2FA 状态、弹窗和请求逻辑
- 用户设置 API 中 2FA 输出
- `User.twoFactorEnabled`、`User.twoFactorSecret`
- 三份语言文件中的 2FA 文案
- `qrcode`、`@types/qrcode`

### 5.4 建议一并删除的死链路

- 未被业务引用的 `src/lib/cms/**` 及 Sanity/Contentful 依赖
- 未被页面使用的 `ContactForm`、`/api/contact`、`Contact`、`ContactStatus` 及注册/统计耦合
- 新项目不需要兼容时的 `/services/**` 重定向层
- 未引用的 `src/types/index.ts`、`getPartnersConfig()` 与缺失 partner 资产配置
- create-next-app 的 `file.svg`、`globe.svg`、`next.svg`、`vercel.svg`、`window.svg`

## 6. 依赖审计

| 依赖 | 现状 | 规划决策 |
|---|---|---|
| `html5-qrcode`、`xlsx` | 仅扫码使用 | 随扫码删除 |
| `qrcode`、`@types/qrcode` | 仅伪 2FA 使用 | 随伪 2FA 删除 |
| `@sanity/client`、`contentful`、`next-sanity` | 仅未接入 CMS 层引用 | 删除并移除远程图片域名 |
| `next-intl` | 无源码引用，项目使用自有 locale context | 删除 |
| `@vercel/speed-insights` | 仅导入但未渲染 | 初期删除；需要监控时重新明确接入 |
| `@types/bcryptjs` | `bcryptjs` v3 可能自带类型 | 安装后由 TypeScript 验证，确认冗余再删 |
| Radix UI 各包 | 对应 UI primitives 正在使用 | 保留，按实际 import 复核 |
| `resend` | 询价邮件使用 | 保留，但修复发送逻辑与模板转义 |

`src/lib/email.ts` 当前每次发信都会调用 Resend 的域名创建、查询和验证 API，这是不应发生在发送路径的副作用；模板直接插入用户输入，也必须 HTML 转义。

## 7. 视觉与内容资产审计

- 当前 CSS 是 shadcn 默认黑白 token 和通用渐变卡片，不表达海外仓储。
- `Amazon FBA.jpg` 实际是 AWS 标识，语义错误。
- `Express Delivery.jpg` 是多家承运商商标拼图，可能暗示未经确认的合作。
- 多张图片内嵌中文，不能适配英文/法文页面。
- 当前素材混合照片、卡通、透明抠图和商标，风格不一致。
- `siteInfo.ogImage` 指向不存在的 `/og-image.jpg`；partner 配置指向不存在目录。
- UPS、FedEx、DHL、Canada Post 等名称未确认合作关系，不应作为合作伙伴背书。

公司资料和真实仓库素材未确认前，应使用明确的中性占位或不展示该模块，不能用假数字、竞品 Logo 或无授权照片填空。

## 8. 工程卫生现状

- 根 README 仍是 create-next-app 默认内容，本轮规划已替换为项目导航。
- 原 `.gitignore` 忽略正式 `/docs`，本轮规划已移除该规则；`.codex-local/` 继续忽略。
- `package.json` 没有 `typecheck` 脚本，另有语义不清的 `build_comment`。
- 没有 `.env.example`，外部服务缺少统一配置清单。
- 当前 `node_modules` 未安装，因此这次审计没有 lint/typecheck/build 结果。
- 代码存在大量 `as any`、吞掉数据库异常、硬编码中文错误和重复的权限判断。
- `next.config.ts` 仍包含已废弃 CMS 图片域名和未安装的 `@radix-ui/react-icons` 优化项。
- 公开页面级 metadata 很少，结构化数据与真实页面/公司状态不一致。

## 9. 审计后的实施优先级

1. 冻结服务枚举、权限矩阵、数据归属和通知语义。
2. 删除扫码、中加方案、伪 2FA、演示登录和对应数据/依赖。
3. 修复 CAPTCHA、询价归属、登录历史、OAuth 链接、富文本净化和服务端授权。
4. 修复询价—报价—通知和文章发布链路。
5. 完成新闻 SSR、metadata、结构化数据和 sitemap。
6. 在业务契约稳定后执行海外仓视觉重构。
7. 删除死代码和依赖，更新 baseline，重新安装并执行全量质量门禁。
