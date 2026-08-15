# AGENTS.md — blog-yusheng

> 羽升的个人博客与电子分身。Next.js 16.2+ (App Router) + TypeScript，部署到腾讯云 EdgeOne Pages (SSG)。
> 本文件是 AI 编码代理的**操作索引**——只放最高频引用的命令和不可省略的硬规则。
> 详细规范在 `docs/` 下按需查阅，见末尾 [Documentation Index](#documentation-index)。

## Tech Stack

- **Framework**: Next.js ≥16.2.0 (App Router only, no Pages Router)
- **React**: ≥19.2 | **TypeScript**: strict mode | **Package Manager**: pnpm
- **Node**: 22.11.0 (EdgeOne 预装版本，必须锁定) | **Styling**: Tailwind CSS
- **Deployment**: 腾讯云 EdgeOne Pages (SSG 静态导出模式)

## Key Commands

- Install: `pnpm install` | Dev: `pnpm dev` (9981) | Build: `pnpm build`
- Typecheck: `pnpm tsc --noEmit` | Lint: `pnpm lint` | Lint fix: `pnpm lint --fix`
- Test: `pnpm test`（测试栈随 issue #4 落地；未落地前 CI 用 `pnpm run --if-present test` 跳过）
- Preview static output: `pnpm preview`（9982，验证 `out/`；`edgeone.json` 的响应头在本地不生效）
- Analyze bundle (PowerShell): `$env:ANALYZE='true'; pnpm build; Remove-Item Env:ANALYZE`
  —— 需先接入 `@next/bundle-analyzer` 并改 `next.config.ts`，两者都要单独授权
- `output: 'export'` 的交付物是 `out/` 静态目录；不要把 `next start` 当成正式静态产物预览命令
- **验证 CI/生产行为必须用干净安装**：本地陈旧的 `node_modules` 会掩盖 peer 解析漂移。
  可疑时 `Remove-Item -Recurse -Force node_modules; pnpm install --frozen-lockfile`

## Shell Environment

> 本地开发环境是 **Windows + PowerShell**，不是 bash/zsh。

- **不要用 `&&` 串联命令** — PowerShell 中 `&` 是调用运算符，`&&` 在旧版 PowerShell 会报语法错误。用 `;` 分隔，或 `cmd1; if ($?) { cmd2 }` 做条件执行
- **不要用 bash heredoc (`<<'EOF'`)** 写多行 commit message — PowerShell 不支持。用 `git commit -F .tmp/<file>` 配合临时文件
- **不要用 `&&`、`||`、`!` 做 shell 条件判断** — PowerShell 语法不同（`-and`、`-or`、`-not`，或 `if ($?)`）
- 路径用反斜杠 `\` 或正斜杠 `/` 都可以，但含空格的路径必须用双引号包裹
- **临时文件只放 `.tmp/`** — 截图、一次性检查脚本、commit message 草稿都写到仓库根目录的 `.tmp/`，不要散落到根目录或其他已跟踪目录；该目录已被 gitignore

## Definition of Done

1. `pnpm lint` exits 0 | 2. `pnpm tsc --noEmit` exits 0 | 3. `pnpm test` exits 0（#4 之后）| 4. `pnpm build` exits 0
5. No file in `out/` exceeds 25 MB | 6. `out/` total files ≤ 20,000
7. Changed files staged | 8. Commit follows Conventional Commits: `type(scope): description`

## When Blocked

- `pnpm build` fails after 3 attempts → stop and report full error output
- Dependency missing → check `package.json` first, then ask
- Merge conflicts → stop and show conflicting files
- EdgeOne deployment fails → check `edgeone.json` and build logs（详见 [docs/ops/deploy-edgeone.md](docs/ops/deploy-edgeone.md)）
- **Never**: delete lock files, force push, skip tests, or bypass lint

## Project Structure

```
src/app/         路由层（只放路由文件，业务逻辑下沉到 src/features/）
src/components/  纯 UI 组件（ui/ 子目录只放无业务逻辑的展示组件）
src/features/    业务领域模块（跨路由复用时才提升，不是长文件回收站）
src/lib/         工具函数、通用 hooks
src/server/      server-only 代码
content/         正式内容仓库（index.md 是文章唯一权威源，文章资产共居）
docs/            项目内部文档（规范/计划/运维/审计）
scripts/         辅助脚本（setup/build/deploy/dev）
public/          静态资源（不放 >25MB 文件）
```

> 完整目录树与文件放置决策树见 [docs/conventions/project-structure.md](docs/conventions/project-structure.md) 和 [docs/conventions/code-size-and-organization.md](docs/conventions/code-size-and-organization.md)。

## Critical Rules（省略了就会犯错）

> 以下是硬性规则，违反会导致构建失败或运行时错误。详细解释见对应规范文档。

- **`proxy.ts` not `middleware.ts`** — 后者已废弃（详见 [nextjs-16-patterns.md](docs/conventions/nextjs-16-patterns.md)）
- **`params`/`searchParams`/`cookies()`/`headers()` 必须 `await`** — Next.js 16 强制异步
- **`next.config.ts` 三件套** — `output: 'export'` + `images.unoptimized` + `trailingSlash`
- **`edgeone.json` 的 `buildCommand` 必须是 `pnpm run build`** — 禁止裸命令 `next build`（EdgeOne 的 `sh -c` 不注入 `node_modules/.bin`，会报 command not found）
- **`edgeone.json` 的 `cloudFunctions` 用新字段** — `maxDuration`（顶层）+ `regions.mainland`，旧字段已 DEPRECATED
- **`rewrites`/`redirects` 写到 `edgeone.json`** — 不写在 `next.config.ts`（SSG 模式下不可用）
- **默认 Server Component，`'use client'` 放叶子组件** — 不放页面级
- **`_dev/` 单向引用 + production 守卫** — 每页顶部 `if (process.env.NODE_ENV === 'production') notFound()`；正式代码不得引用 `_dev/`
- **TypeScript strict，禁止 `any`** — 用 `unknown` + 类型收窄
- **正式文章唯一权威源是 `content/posts/<slug>/index.md`** — 评论、注释、草稿不得覆盖或写回正本
- **一套 doc-engine，多种 profile** — 正文、评论/注释、编辑预览与导出共享 Canonical IR/注册表；不得各写一套解析器
- **评论是文章级，注释是选区级** — 划词入口只能创建注释；评论区只能创建文章评论
- **讨论内容是永久不可信输入** — 只走 `discussion` profile，禁用原始 HTML、任意 JS/CSS/iframe/动态 import，并在最终渲染前 sanitize
- **PDF 必须直接下载** — 禁止使用 `window.print()` 或系统打印对话框代替 PDF 导出
- **默认构建期完成，推不动才进浏览器** — 公式渲染、图片尺寸/格式转换在构建期；Mermaid、嵌入、讨论解析、导出在浏览器且必须按需加载；阅读首屏与讨论/导出/3D 分开计量，预算见 [blog-content-engine.md 13.1–13.3](docs/specs/blog-content-engine.md)
- **中文字体按 `unicode-range` 切片** — 不按"站内已用字"整体裁剪（讨论区字符集构建期不可知）
- **博客页 1:1 对标原型** — `/blog/` 与 `/blog/<slug>/` 的布局、交互与视觉以 [blog-reader-prototype.html](docs/designs/blog-reader-prototype.html) 为准，不得另起一套外观；文字说明见 [blog-reader-design.md](docs/designs/blog-reader-design.md)，token 仍走 [frontend-design.md](docs/conventions/frontend-design.md)
- **全站共用外壳与阻尼动效** — 绳挂导航、下落便签通知、弹窗、抽屉、滚动条以同一份原型为模板，其它路由只换内容；UI 动效是阻尼、慢、`--ease-damp`。大块栏/页尾禁止弹簧回弹；导出/设置/弹窗用 `--ease-pop` 放大并只回弹一次；Tab 切换走短骨架懒载。细则见 frontend-design 第三节 / 四之四，架构 D21

> 完整代码风格规范见 [docs/conventions/code-style.md](docs/conventions/code-style.md)。
> Code review 检查清单见 [docs/conventions/code-review.md](docs/conventions/code-review.md)。

## Git Workflow

- 默认从 `main` 分支切出；任务明确指定 `dev` 或其他基线时服从任务，前缀使用 `feat/`、`fix/`、`chore/`
- Commit: Conventional Commits（`feat(video): add preview component`）
- Squash merge PRs，PR 需通过 CI 和至少一次审查

### Issue 与 PR 协作（强制 skill）

> 创建 issue、处理 issue 驱动开发、创建 PR 时，**必须先调用对应 skill**，不要自行发挥流程。

- **创建 issue / 拆 issue / 创建子 issue** → 调用 `/agents:issue-to-pr` 或 `/claude:issue-creator` skill
- **根据 issue 做 PR / issue 驱动开发** → 调用 `/agents:issue-to-pr` skill
- 这两个 skill 定义了"人类优先、AI 友好"的双层信息架构、sub-issue 拆解、PR-issue 关联等规范，跳过 skill 直接操作会破坏项目协作一致性

## Boundaries

### ✅ Allowed without asking

- 读取文件、列出目录
- 运行 `pnpm lint`、`pnpm tsc --noEmit`、单文件测试
- 修改 `src/` 下的业务代码、路由文件、`src/components/ui/` 下的 UI 组件
- 在 `src/app/_dev/` 下创建调试页面

### ⚠️ Ask first

- 安装或删除依赖（`pnpm add` / `pnpm remove`）
- 删除文件
- 修改 `next.config.ts`、`edgeone.json`、`tsconfig.json` 或 ESLint 配置
- Push 到 Git 或创建 PR

### 🚫 Never

- 提交 `.env*` 文件或任何密钥/凭据
- Force push 到 `main` 或受保护分支
- 修改 `out/`、`.next/`、`.edgeone/` 构建产物
- 修改 `pnpm-lock.yaml`（只通过 `pnpm install` 间接修改）
- 把超过 25 MB 的文件放入 `public/`
- 在 `next.config.ts` 中使用 `rewrites` 或 `redirects`（用 `edgeone.json`）
- 使用 `middleware.ts`（已废弃，用 `proxy.ts`）/ Pages Router（`pages/` 目录）
- 将 `src/app/_dev/` 中的代码导入到正式路由或组件中（单向引用）

## Key Files

- `next.config.ts` — Next.js 配置（output/images/trailingSlash）
- `edgeone.json` — EdgeOne 部署配置（详见 [docs/ops/deploy-edgeone.md](docs/ops/deploy-edgeone.md)）
- `src/app/layout.tsx` — 根 layout（必须含 `<html>` `<body>`）
- `src/app/globals.css` — 全局样式入口
- `content/posts/<slug>/index.md` — 正式文章唯一权威源（实现后存在）
- `src/features/doc-engine/` — 文档解析、注册表、profile、安全与导出内核（实现后存在）
- `proxy.ts` — 网络边界代理（替代 middleware.ts；需要网络边界时创建）
- `instrumentation.ts` — 监控/性能追踪（接入监控时创建）
- `.env.example` — 环境变量模板（首次引入环境变量时创建；真实 `.env*` 不提交）

## Documentation Index

> 详细规范在 `docs/` 下，按需查阅。不要一次性全部读取——只在相关任务时读对应文档。

### docs/conventions/ — 项目规范

- [code-size-and-organization.md](docs/conventions/code-size-and-organization.md) — 代码长度与文件组织（colocation 原则、`src/features/` 提升条件、拆分判断方法）
- [project-structure.md](docs/conventions/project-structure.md) — 完整目录结构与分层规则（含 content/ 内容仓库与 features 模块划分）
- [routing.md](docs/conventions/routing.md) — 路由规范（页面地图、URL 规则、导航映射、分享规范）
- [frontend-design.md](docs/conventions/frontend-design.md) — 前端设计规范（主题 token、字体、阻尼动效、z-index、全站共用外壳、音效；形态 1:1 对标原型）
- [ports-and-env.md](docs/conventions/ports-and-env.md) — 端口与本地环境规范
- [nextjs-16-patterns.md](docs/conventions/nextjs-16-patterns.md) — Next.js 16.2+ 关键模式与陷阱（proxy.ts、async APIs、Turbopack、SSG 配置等）
- [code-style.md](docs/conventions/code-style.md) — 代码风格（Server Component、use client、TypeScript、Tailwind、_dev/ 规则）
- [code-review.md](docs/conventions/code-review.md) — Code review 检查清单

### docs/designs/ — 设计文档

- [architecture-overview.md](docs/designs/architecture-overview.md) — 整体架构决策记录（公开身份、内容协议、文档引擎、评论/注释、安全渲染、导出、动画与部署）
- [blog-reader-prototype.html](docs/designs/blog-reader-prototype.html) — 博客列表页/阅读页 **1:1 视觉与交互对标**
- [blog-reader-design.md](docs/designs/blog-reader-design.md) — 上述原型的文字说明与待确认项

### docs/specs/ — 技术规格

- [blog-content-engine.md](docs/specs/blog-content-engine.md) — 内容协议、Canonical IR、renderer/profile、安全讨论、划词锚定、多格式导出契约与执行位置/性能预算

### docs/plans/ — 工程计划

- [plan-blog-foundation.md](docs/plans/plan-blog-foundation.md) — 博客内容系统 P0–P3 范围、依赖与验收标准

### docs/ops/ — 运维指南

- [deploy-edgeone.md](docs/ops/deploy-edgeone.md) — EdgeOne Pages 部署配置规范（字段规范、buildCommand 踩坑记录、cloudFunctions 迁移、检查清单、故障排查）

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
