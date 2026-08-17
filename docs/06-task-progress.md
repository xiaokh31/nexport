# ZNB 开发进度（截至 2026-08-17）

## 总览

- 已完成：28 / 31。
- 执行中：无。
- 待执行：`VERCEL-001`、`QA-004`、`RELEASE-001`。
- 当前可领取：`VERCEL-001`。
- 唯一执行顺序：`BRAND-001 → VERCEL-001 → QA-004 → 人工生产变更授权门（Go/No-Go） → RELEASE-001`，不得并行越级。

## 已完成基线

FND-001、CLN-001～004、DATA-001～002、TEST-001、SEC-001～003、RBAC-001、SAFE-001、NOTIF-001、AUTH-001、QUOTE-001、ARTICLE-001、SEO-001、UI-001～004、HYG-001、DOC-001、QA-001～003、BRAND-001 已完成。

QA-003 的最后一次已记录验收结果：lint/typecheck 退出码为 0；单元测试 34 文件/186 用例、集成测试 10 文件/29 用例、Playwright 14 文件/53 用例全部通过且零跳过。真实 Chromium 覆盖 320、375、768、1024、1440、1920 六档宽度；公开页、客户区域和后台关键流程无横向滚动、无名可见控件、console/hydration/page/image/request 错误。记录环境为 Node `v24.18.0`、pnpm `10.27.0`；AGPL-3.0 `LICENSE` 未修改。

这组结果证明的是新增品牌/Vercel 波次之前的本地基线，不自动证明生产环境可发布。`BRAND-001` 或 `VERCEL-001` 产生代码变更后，必须由 `QA-004` 重跑全量门禁。

## 新确认决策

- 公司法定/展示名称：`ZNB Logistics Inc.`。
- 网站简称：`ZNB`。
- 生产平台与套餐：Vercel Hobby（项目方明确指定）。
- Hobby 原生 Cron 最多每天一次且时间精度为小时级，邮件 outbox 主链路改用支持 Bearer header 的外部调度器，目标每 5 分钟调用。
- Vercel 官方当前把 Hobby 限定为个人、非商业用途；正式企业网站公开前由项目方确认使用资格或取得 Vercel 允许，技术可部署不等于条款已满足。
- 正式域名、Logo、favicon、OG 图、公开联系方式、公司介绍、隐私/条款定稿、托管 PostgreSQL 供应商和区域仍待负责人确认。
- `BRAND-001` 已把已确认名称接入业务源码；外部邮件调度与 Prisma direct/pool 契约仍未实现。

## 待执行任务

| ID | 状态 | 下一步 | 发布条件 |
|---|---|---|---|
| `BRAND-001` | 已完成 | 精准接入 `ZNB Logistics Inc.` / `ZNB`，未知事实继续隐藏 | lint/typecheck、35 文件/192 单元用例、10 文件/29 集成用例及隔离迁移后 build 均通过 |
| `VERCEL-001` | 可领取 | 完成 Prisma direct/pool、Hobby env/Preview、受保护 GET 和外部调度契约 | `BRAND-001` 已完成 |
| `QA-004` | 被依赖与外部资源阻塞 | frozen install、全量本地门禁、普通 Preview 与固定 staging 验收 | 前两项完成，且项目方 provision/授权 staging、数据库和测试 provider |
| `RELEASE-001` | 未授权 | 首次生产迁移、部署、域名和运维移交 | `QA-004` 通过且生产变更授权门签字、明确生产授权 |

完整文件范围和验收标准见 [`05-agent-backlog.md`](05-agent-backlog.md)。本地执行见 [`07-testing.md`](07-testing.md)，生产流程见 [`08-vercel-production-deployment.md`](08-vercel-production-deployment.md)。

## 当前已知发布差距

- 正式 Logo、favicon、OG 图、域名和公开联系方式仍未确认；当前只使用文本品牌，联系方式占位继续受隐藏门禁保护。
- Prisma 当前只读取 `DATABASE_URL`，没有迁移专用 `DIRECT_URL`。
- `/api/cron/email-outbox` 当前只导出 `POST`；外部调度目标接口、provider、Bearer 配置和告警尚未实现。Hobby 不配置高频 Vercel Cron。
- 当前公开 metadata/robots 默认允许索引；`VERCEL-001` 必须实现仅 Production 显式开启索引、其余环境 app-level noindex/no-follow 与 Deployment Protection。
- `pnpm test:all` 只覆盖 unit/integration/E2E，不包含 lint、typecheck 或 build；QA-004 必须分别执行。
- Vercel、数据库、域名、DNS、Resend、OAuth、CAPTCHA 和生产 secret 均属于外部状态，不能在无权限时由开发 Agent 假定已经配置。

## 最近已修复问题

BRAND-001 建立了 `legalName` / `displayName` / `shortName` 单一来源，将 metadata、Header/Footer、认证与工作区、About、邮件和三语品牌文案接入 `ZNB Logistics Inc.` / `ZNB`；manifest 改由 `src/app/manifest.ts` 生成。隐私/条款 fallback 明确标为未获准发布并移除示例联系方式，About 移除未证实的领先、设施、客户与历史主张；客户“公司名称”、`nexport-test-only`、Compose/数据库和 package 内部标识保持不变。后台 Settings 现明确说明保存不会自动发布到公开 shell。

本任务在 Node `v24.18.0`、pnpm `10.27.0` 下通过 lint、typecheck、35 个单元测试文件/192 用例、10 个集成测试文件/29 用例，以及本机 `55432` 隔离 PostgreSQL 应用 `0_init` 后的生产构建；构建生成 58 个页面/路由并确认 `/manifest.webmanifest` 为静态路由。测试容器、网络和 tmpfs 数据已清理，AGPL-3.0 `LICENSE` SHA-256 仍为 `8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef`。

QA-003 修复了三项无障碍/hydration 缺陷：法语偏好恢复时未同步 `<html lang>`、已登录 Header 的 Radix 服务端/客户端 ID 序列不一致、共享表单 label/control 的 `useId` 在流式 hydration 中不稳定。对应单元与 Playwright 回归已固化；当前本地基线无遗留故障。
