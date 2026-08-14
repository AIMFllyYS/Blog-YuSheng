# 端口与本地环境规范

> Created: 2026-08-14
> Updated: 2026-08-14
> Status: accepted（决策背景见 [docs/designs/architecture-overview.md](../designs/architecture-overview.md)）

## 一、端口分配

| 端口 | 用途 | 命令 |
|---|---|---|
| **9981** | 开发服务器（已在 package.json 配置） | `pnpm dev` |
| **9982** | 静态产物预览（本地模拟 EdgeOne 线上行为，验证 `out/` 产物） | 后续加 `pnpm preview` 脚本 |
| 9983-9989 | 预留（未来本地工具 / mock 服务按序取用，取用后登记到本表） | — |

规则：
- 本项目所有本地服务固定使用 998x 段，避免与其他项目冲突
- 新增本地服务必须先查本表再取端口，取用后更新本表

## 二、环境变量

- Supabase 的 URL 与匿名 Key 使用 `NEXT_PUBLIC_*` 前缀（构建时注入静态产物；匿名 Key 本身设计为可公开，数据安全靠 Supabase 行级权限策略保障）
- 所有变量在 `.env.example` 登记模板与说明；真实 `.env*` 永不入库（已列入 AGENTS.md 🚫 边界）
- Supabase 若未来启用本地开发栈，使用其默认端口段（54321+），与 998x 段不冲突

## 三、本地环境基线

- Node 22.11.0（锁定 EdgeOne 预装版本）
- pnpm（版本以 package.json `packageManager` 字段为准）
- Windows + PowerShell（命令串联用 `;`，不用 `&&`，详见 AGENTS.md Shell Environment）
