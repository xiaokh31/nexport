# ZNB 开发进度（截至 2026-08-17）

## 总览

- 已完成：29 / 31。
- 执行中：无。
- 被外部资源阻塞：`QA-004`（本地全量门禁已通过；真实 Vercel Preview/固定 staging 尚未 provision）。
- 待执行：`RELEASE-001`。
- 当前可领取：无；须由项目方提供或授权 Vercel project、隔离 staging 数据库与测试 provider 后继续 `QA-004`。
- 唯一执行顺序：`BRAND-001 → VERCEL-001 → QA-004 → 人工生产变更授权门（Go/No-Go） → RELEASE-001`，不得并行越级。

## 已完成基线

FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001、ARTICLE-001、SEO-001、UI-001～004、HYG-001、DOC-001、QA-001～003、BRAND-001、VERCEL-001 已完成。

QA-003 的最后一次已记录验收结果：lint/typecheck 退出码为 0；单元测试 34 文件/186 用例、集成测试 10 文件/29 用例、Playwright 14 文件/53 用例全部通过且零跳过。真实 Chromium 覆盖 320、375、768、1024、1440、1920 六档宽度；公开页、客户区域和后台关键流程无横向滚动、无名可见控件、console/hydration/page/image/request 错误。记录环境为 Node `v24.18.0`、pnpm `10.27.0`；AGPL-3.0 `LICENSE` 未修改。

这组结果证明的是新增品牌/Vercel 波次之前的本地基线，不自动证明生产环境可发布。`BRAND-001` 或 `VERCEL-001` 产生代码变更后，必须由 `QA-004` 重跑全量门禁。

## 新确认决策

- 公司法定/展示名称：`ZNB Logistics Inc.`。
- 网站简称：`ZNB`。
- 生产平台与套餐：Vercel Hobby（项目方明确指定）。
- Hobby 原生 Cron 最多每天一次且时间精度为小时级，邮件 outbox 主链路改用支持 Bearer header 的外部调度器，目标每 5 分钟调用。
- Vercel 官方当前把 Hobby 限定为个人、非商业用途；正式企业网站公开前由项目方确认使用资格或取得 Vercel 允许，技术可部署不等于条款已满足。
- 正式域名、Logo、favicon、OG 图、公开联系方式、公司介绍、隐私/条款定稿、托管 PostgreSQL 供应商和区域仍待负责人确认。
- `BRAND-001` 已把已确认名称接入业务源码；`VERCEL-001` 已交付外部邮件调度与 Prisma direct/pool 代码契约，但未创建任何真实外部资源。

## 待执行任务

| ID | 状态 | 下一步 | 发布条件 |
|---|---|---|---|
| `BRAND-001` | 已完成 | 精准接入 `ZNB Logistics Inc.` / `ZNB`，未知事实继续隐藏 | lint/typecheck、35 文件/192 单元用例、10 文件/29 集成用例及隔离迁移后 build 均通过 |
| `VERCEL-001` | 已完成 | Node/pnpm、Prisma direct/pool、受控迁移、Preview noindex、可信 IP、受保护 GET 和外部调度契约已落地 | 36 文件/202 单元用例、10 文件/29 集成用例、隔离迁移与无 `DIRECT_URL` Preview build 通过 |
| `QA-004` | 本地通过；外部阻塞 | frozen install、静态门禁、隔离迁移、unit/integration/E2E、无 `DIRECT_URL` Preview build 与本地 production smoke 已通过 | 仍需项目方 provision/授权真实 Vercel Preview、固定 staging、隔离托管数据库和测试 provider |
| `RELEASE-001` | 未授权 | 首次生产迁移、部署、域名和运维移交 | `QA-004` 通过且生产变更授权门签字、明确生产授权 |

完整文件范围和验收标准见 [`05-agent-backlog.md`](05-agent-backlog.md)。本地执行见 [`07-testing.md`](07-testing.md)，生产流程见 [`08-vercel-production-deployment.md`](08-vercel-production-deployment.md)。

## 当前已知发布差距

- 正式 Logo、favicon、OG 图、域名和公开联系方式仍未确认；当前只使用文本品牌，联系方式占位继续受隐藏门禁保护。
- Vercel、托管 PostgreSQL、正式域名、固定 staging、外部 scheduler 与真实 provider 仍未 provision；代码契约完成不等于平台配置或自动调度已验收。
- 只有 Vercel Production 显式 `SITE_INDEXING_ENABLED=true` 才允许索引；Preview 实测有 `X-Robots-Tag: noindex, nofollow`、robots 全拒绝和空 sitemap，但真实部署仍必须启用 Deployment Protection。
- 生产数据库供应商、区域、连接上限、备份/PITR/RPO/RTO、外部 scheduler provider 与责任人仍须在 QA-004 准入和 RELEASE-001 Go/No-Go 中填写，未被代码硬编码。
- `pnpm test:all` 只覆盖 unit/integration/E2E，不包含 lint、typecheck 或 build；QA-004 必须分别执行。
- Vercel、数据库、域名、DNS、Resend、OAuth、CAPTCHA 和生产 secret 均属于外部状态，不能在无权限时由开发 Agent 假定已经配置。

## QA-004 当前执行证据

本地门禁环境：Node `v24.18.0`、pnpm `10.27.0`、Docker Engine Client/Server `29.5.3`、Docker Compose `v5.1.4`、PostgreSQL `16.15`。`pnpm install --frozen-lockfile` 确认 lockfile 无漂移并完成 postinstall Prisma generate；随后 Prisma generate/validate、lint、typecheck 和 AGPL-3.0 `LICENSE` SHA-256 检查均退出 0。

首次 `pnpm test:all` 暴露一项测试建模回归：旧 SEO E2E 在非 Production 环境仍期待可抓取 sitemap，与 VERCEL-001 的 fail-safe 空 sitemap 契约冲突。修正后，E2E 明确验证非 Production HTML robots/noindex、HTTP `X-Robots-Tag` 和空 sitemap；集成测试新增“只有显式启用的 Vercel Production 才生成含已发布文章的 sitemap”。从空 tmpfs 数据库完整重跑后，unit 36 文件/202 用例、integration 10 文件/30 用例、Chromium E2E 14 文件/53 用例全部通过且零跳过。

本地 `staging:qa004-local-preview` 隔离目标经受控 migration runner 显示脱敏摘要、先发现 pending `0_init`、deploy 后复查 up to date。随后明确移除 `DIRECT_URL`、Google OAuth、reCAPTCHA、Resend 和 `CRON_SECRET`，只用池化测试 URL 完成 Vercel Preview 环境模型的 production build，共生成 58 个路由/页面。

按 `webapp-testing` server-lifecycle 规范执行的独立无头 Chromium smoke 确认 `/`、`/solutions`、`/news`、`/login`、`/contact` 均为 200；HTML meta 与所有响应为 noindex/nofollow、robots 全拒绝、sitemap 空、manifest 为 `ZNB Logistics Inc.` / `ZNB`，浏览器 console/page error 均为 0。无 Preview worker secret 时真实 route 返回 503；临时注入测试专用 worker 配置后，缺失/错误 Bearer 均为 401，合法 GET 与重复 GET 均为 200、claimed 为 0，没有访问 Resend。首页截图已人工复核品牌、布局和占位隐藏，随后与一次性 Python 环境一并删除。

`test:all` 和最后的 production smoke 均已清理 `nexport-test` 容器、网络、fixtures 与 tmpfs；当前 Docker 无运行容器。未读取或接触生产/托管数据库、真实客户数据、Vercel、DNS 或真实 provider，未执行 Git 操作。

外部阶段无法执行的客观证据：仓库没有 `.vercel` project link，进程环境没有 Vercel、托管 `DATABASE_URL` / `DIRECT_URL`、Resend、reCAPTCHA 或 `CRON_SECRET` 配置，也没有项目方 provision/授权记录。因此不能验证 Vercel Build Logs 的实际 Node/pnpm、Deployment Protection 与 bypass 双 header、真实普通 Preview noindex、固定 staging 的独立数据库/provider、测试邮件投递和资源所有者/撤销结果；这些本地结果不得冒充真实 Preview/staging 证据。真实 Production scheduler 仍明确留给 `RELEASE-001`。

## 最近已修复问题

VERCEL-001 将 Node 固定为 `24.x`、保留 pnpm `10.27.0` 并新增无迁移的 `vercel.json` install/build 契约；Prisma 增加池化 `DATABASE_URL` / 直连 `DIRECT_URL`，受控 runner 用精确 host allowlist、目标/备份/Production 确认和脱敏摘要保护 migration/admin 操作。NextAuth 固定显式 canonical，Vercel 请求只信任 `x-vercel-forwarded-for`；非 Vercel Production 未验证代理跳数会 fail closed。

邮件 outbox 现由共享 handler 同时支持受 Bearer 保护的 `GET`/`POST`，外部 scheduler 契约固定为每 5 分钟、50 秒超时和有限重试，仓库不配置 Hobby 高频 Cron。只有显式启用的 Vercel Production 允许索引，其他环境四层 noindex；生产 `.vercel.app` host 在平台变量与 canonical 均有效时永久重定向。Deployment Protection 的 bypass 与应用 Bearer 保持双 header，真实 provider 仍留给授权后的 RELEASE-001。

本任务在 Node `v24.18.0`、pnpm `10.27.0` 下通过 Prisma generate/validate、lint、typecheck、36 个单元测试文件/202 用例、10 个集成测试文件/29 用例；受控 runner 在空的 `nexport_test` 隔离库先显示 pending status、应用 `0_init` 后复查 up to date。Vercel Preview 生产模式构建在明确移除 `DIRECT_URL` 后生成 58 个路由/页面，实际 HTTP smoke 确认 noindex header、robots 全拒绝和空 sitemap。未访问生产或外部托管资源；测试容器、网络与 tmpfs 数据已清理。

BRAND-001 建立了 `legalName` / `displayName` / `shortName` 单一来源，将 metadata、Header/Footer、认证与工作区、About、邮件和三语品牌文案接入 `ZNB Logistics Inc.` / `ZNB`；manifest 改由 `src/app/manifest.ts` 生成。隐私/条款 fallback 明确标为未获准发布并移除示例联系方式，About 移除未证实的领先、设施、客户与历史主张；客户“公司名称”、`nexport-test-only`、Compose/数据库和 package 内部标识保持不变。后台 Settings 现明确说明保存不会自动发布到公开 shell。

本任务在 Node `v24.18.0`、pnpm `10.27.0` 下通过 lint、typecheck、35 个单元测试文件/192 用例、10 个集成测试文件/29 用例，以及本机 `55432` 隔离 PostgreSQL 应用 `0_init` 后的生产构建；构建生成 58 个页面/路由并确认 `/manifest.webmanifest` 为静态路由。测试容器、网络和 tmpfs 数据已清理，AGPL-3.0 `LICENSE` SHA-256 仍为 `8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef`。

QA-003 修复了三项无障碍/hydration 缺陷：法语偏好恢复时未同步 `<html lang>`、已登录 Header 的 Radix 服务端/客户端 ID 序列不一致、共享表单 label/control 的 `useId` 在流式 hydration 中不稳定。对应单元与 Playwright 回归已固化；当前本地基线无遗留故障。
