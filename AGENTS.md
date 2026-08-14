# AGENTS.md — blog-yusheng

## Project Overview

羽升的个人博客与电子分身项目。记录 AI 领域成长轨迹、沉淀方法论、构建带有权限系统的个人内容空间。从占位启航，逐步生长为完整的电子分身。

- **双运行模式**：本地运行（开发/测试） + 线上腾讯云 EdgeOne Pages 部署（生产）
- **前端基础**：Next.js 16.2+ (App Router) + TypeScript，部署到腾讯云 EdgeOne Pages

## Tech Stack

- **Framework**: Next.js ≥16.2.0 (App Router only, no Pages Router)
- **React**: ≥19.2
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Node**: 22.11.0 (EdgeOne 预装版本，必须锁定)
- **Styling**: Tailwind CSS
- **Deployment**: 腾讯云 EdgeOne Pages (SSG 静态导出模式)

## Key Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Start (prod local): `pnpm start`
- Typecheck: `pnpm tsc --noEmit`
- Lint: `pnpm lint`
- Lint fix: `pnpm lint --fix`
- Analyze bundle: `ANALYZE=true pnpm build`

## Definition of Done

A task is complete when ALL of the following pass:

1. `pnpm lint` exits 0
2. `pnpm tsc --noEmit` exits 0
3. `pnpm build` exits 0
4. No file in `out/` exceeds 25 MB (check: `find out -type f -size +25M`)
5. Total file count in `out/` does not exceed 20,000
6. Changed files have been staged
7. Commit message follows Conventional Commits format: `type(scope): description`

## When Blocked

- If `pnpm build` fails after 3 attempts: stop and report the full error output
- If a dependency is missing: check `package.json` first, then ask
- If you encounter merge conflicts: stop and show the conflicting files
- If EdgeOne deployment fails: check `edgeone.json` configuration and build logs
- **Never**: delete lock files to resolve errors, force push, skip tests, or bypass lint

## Project Structure

```
.
├── src/                        # 源代码
│   ├── app/                    # 路由层：只放路由文件，不放业务逻辑
│   │   ├── layout.tsx          # 根 layout（必须含 <html> <body>）
│   │   ├── page.tsx            # 首页 /
│   │   ├── loading.tsx         # 全局 loading skeleton
│   │   ├── error.tsx           # 全局 error boundary（必须 'use client'）
│   │   ├── not-found.tsx       # 全局 404
│   │   ├── global-error.tsx    # 根 layout 级 error boundary
│   │   ├── globals.css         # 全局样式
│   │   ├── (marketing)/        # 路由组：公共页面（不影响 URL）
│   │   │   ├── layout.tsx
│   │   │   └── about/page.tsx  # /about
│   │   ├── (app)/              # 路由组：登录后应用
│   │   │   ├── layout.tsx      # auth guard + app shell
│   │   │   └── dashboard/page.tsx
│   │   ├── _dev/              # 开发调试页面（不暴露给用户，production 返回 404）
│   │   ├── api/                # Route Handlers
│   │   │   └── ping/route.ts
│   │   └── [...slug]/page.tsx  # catch-all 动态路由
│   ├── components/
│   │   └── ui/                 # 纯展示组件（Button, Card, Input 等）
│   ├── features/               # 业务功能模块（按领域聚合）
│   │   └── video/
│   │       ├── actions.ts      # Server Actions（写操作）
│   │       ├── queries.ts      # 数据读取（只读）
│   │       ├── schemas.ts      # Zod 校验 schema
│   │       ├── types.ts        # TS 类型
│   │       └── components/     # 该功能的 UI 组件
│   ├── lib/                    # 工具函数、通用 hooks
│   └── server/                 # server-only 代码（import 'server-only'）
├── docs/                       # 项目内部文档
│   ├── plans/                  # 项目计划、路线图、里程碑
│   ├── conventions/            # 项目规范、编码约定、架构规范
│   ├── updates/                # 更新日志、变更记录
│   ├── specs/                  # 技术规格（功能/API/AI harness 规格）
│   ├── audits/                 # 审计报告（性能/安全/代码）
│   ├── ops/                    # 运维指南（本地运行/部署教程）
│   ├── issues/                 # 问题追踪与记录
│   └── designs/                # 设计文档（架构/UI/技术方案）
├── scripts/                    # 辅助脚本
│   ├── setup/                  # 环境初始化、依赖安装、配置生成
│   ├── build/                  # 构建辅助、产物检查、bundle 分析
│   ├── deploy/                 # EdgeOne 部署、环境变量同步
│   └── dev/                    # 开发辅助、mock 数据、调试脚本
├── public/                     # 静态公共资源（不放 >25MB 文件）
├── AGENTS.md                   # AI 编码代理操作策略
├── edgeone.json                # EdgeOne 部署配置
├── next.config.ts              # Next.js 配置
└── package.json
```

- `src/app/` 只放路由入口文件，业务逻辑下沉到 `src/features/`
- `src/components/ui/` 只放无业务逻辑的纯 UI 组件
- 单个路由专用文件（actions/schemas）可 colocate 在路由目录内
- 跨路由共享的逻辑必须提升到 `src/features/`
- `docs/` 存放项目内部文档，每个子目录有 README.md 说明用途
- `scripts/` 存放辅助脚本，按 setup/build/deploy/dev 分类
- `src/app/_dev/` 是隔离调试区：调试/原型代码放此处，不放入正式路由

## Non-Obvious Patterns (Next.js 16.2+)

### proxy.ts replaces middleware.ts

- 文件名是 `proxy.ts`，不是 `middleware.ts`（后者已废弃）
- 导出 `proxy` 函数，不是 `middleware`
- 运行时固定 `nodejs`，不支持 `edge` runtime
- 配置项 `skipMiddlewareUrlNormalize` 已改名 `skipProxyUrlNormalize`

### Async Request APIs (强制异步)

`params`、`searchParams`、`cookies()`、`headers()`、`draftMode()` 在 Next.js 16 中**必须 `await`**：

```ts
// ✅ correct
export default async function Page({ params }: PageProps) {
  const { slug } = await params
  // ...
}

// ❌ wrong — will throw at runtime
export default function Page({ params }: PageProps) {
  const { slug } = params  // params is a Promise, not an object
}
```

### Turbopack is default

- `pnpm dev` 和 `pnpm build` 默认使用 Turbopack，无需 `--turbopack` 标志
- 如果有自定义 `webpack` 配置，构建会直接失败
- 解决：迁移到 Turbopack 选项，或使用 `--webpack` 回退

### Static Export (SSG) Configuration

`next.config.ts` 必须包含以下配置：

```ts
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
}
```

- `output: 'export'` — 启用静态导出，输出到 `out/`
- `images.unoptimized: true` — 静态导出必须禁用图片优化
- `trailingSlash: true` — EdgeOne 兼容性要求
- 构建输出目录是 `out/`，不是 `.next/`

### cacheComponents replaces experimental.ppr

- 旧的 `experimental.ppr` 已移除
- 使用 `cacheComponents: true` 开启 Partial Prerendering

### adapterPath is stable (top-level)

- 16.2 起 `adapterPath` 从 `experimental` 升级为顶层配置项
- 不再写 `experimental.adapterPath`

### Route Segment Config

可在 `page.tsx` / `route.ts` 顶部导出：

```ts
export const runtime = 'nodejs'        // 或 'edge'
export const maxDuration = 60          // 秒，不超过 EdgeOne Cloud Function 限制
export const preferredRegion = 'auto'  // 或 'global' / 'home'
export const dynamicParams = true
```

### Other Conventions

- `error.tsx` 必须是 Client Component（`'use client'`）
- `route.ts` 和 `page.tsx` 不能共存于同一目录
- `generateStaticParams()` 用于动态路由静态化
- `metadata` / `generateMetadata()` 替代旧版 `head.tsx`
- `next/link` 的 `transitionTypes` prop 支持 View Transitions（16.2+）

## EdgeOne Pages Deployment Constraints

### Hard Limits

| Constraint | Limit |
|---|---|
| Single file size | ≤ 25 MB |
| Total files per project | ≤ 20,000 |
| Total storage | ≤ 5 GB |
| Build timeout | 20 minutes |
| Cloud Function package | ≤ 128 MB |
| Cloud Function request body | ≤ 6 MB |
| Cloud Function max duration | 30s default, 120s configurable |
| Edge Function package | ≤ 5 MB |
| Edge Function request body | ≤ 1 MB |
| Edge Function CPU time slice | 200 ms |

### Configuration Rules

- **Next.js 原生 `rewrites` / `redirects` 不可用** — 必须写到 `edgeone.json`
- `edgeone.json` 放在项目根目录，配置 `buildCommand`、`outputDirectory`、`redirects`、`rewrites`、`headers`、`cloudFunctions`
- `outputDirectory` 设为 `"out"`（SSG 模式）
- 大文件/视频/媒体**不放进 `public/`**，走腾讯云 COS / CDN
- 环境变量：`NEXT_PUBLIC_` 前缀进客户端，敏感信息不带前缀
- 部署时在 EdgeOne 控制台同步所有环境变量

### edgeone.json Reference

```json
{
  "name": "blog-yusheng",
  "buildCommand": "next build",
  "installCommand": "pnpm install",
  "outputDirectory": "out",
  "nodeVersion": "22.11.0",
  "redirects": [
    { "source": "/old-path", "destination": "/new-path", "statusCode": 301 }
  ],
  "headers": [
    {
      "source": "/_next/static/*",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "cloudFunctions": {
    "mainlandRegions": ["ap-guangzhou"],
    "nodejs": { "maxDuration": 30 }
  }
}
```

## When Writing Code

- 文件长度保持克制，但不设硬性行数上限；当文件明显过长、职责开始混杂时，按职责拆分到 `src/features/`，**禁止为凑行数而硬拆分**（拆分依据是职责边界，不是行数）
- 单个函数保持简短、聚焦单一职责；过长时优先考虑是否承担了过多职责，按职责拆分，不设硬性行数上限
- 默认 Server Component，仅需要交互/浏览器 API 时加 `'use client'`
- `'use client'` 尽量放在叶子组件，不要放在页面级
- 使用 `next/dynamic` 做客户端组件懒加载
- 命名导出优先；page/layout 除外（Next.js 要求默认导出）
- TypeScript strict mode，禁止 `any`，用 `unknown` + 类型收窄
- 使用 `clsx` 或 `cn()` 处理条件 className
- Tailwind CSS for styling，不使用 CSS Modules（除非覆盖第三方组件）
- 新功能必须写测试
- 改动后运行 `pnpm lint` 确认无错误
- 调试/原型代码放在 `src/app/_dev/` 下，不放入正式路由
- 每个 `_dev/` 页面顶部必须有 production 环境守卫：`if (process.env.NODE_ENV === 'production') notFound()`
- `_dev/` 可以引用正式组件，但正式代码不得引用 `_dev/` 中的任何内容（单向引用）
- 调试完成后，将代码迁移到正式路由，清理 `_dev/` 中的调试页面

## When Reviewing Code

- 检查文件/函数是否过长且未按职责拆分（关注职责混杂，而非行数本身）
- 检查是否有 `'use client'` 被过度使用（应只在叶子组件）
- 检查 `params` / `searchParams` 是否正确 `await`
- 检查是否有 `middleware.ts` 残留（应为 `proxy.ts`）
- 检查 `next.config.ts` 是否包含 `output: 'export'` + `images.unoptimized` + `trailingSlash`
- 检查是否有大文件被放入 `public/`
- 检查 `edgeone.json` 的 `outputDirectory` 是否为 `"out"`
- 检查是否有 `rewrites` / `redirects` 写在 `next.config.ts` 中（应移到 `edgeone.json`）
- 检查 `src/app/_dev/` 页面是否有 `NODE_ENV === 'production'` 守卫
- 检查是否有正式代码引用了 `src/app/_dev/` 中的内容（应单向引用）

## When Deploying

- 确认 `pnpm build` 本地通过
- 确认 `out/` 目录存在且无超过 25 MB 的文件
- 确认 `edgeone.json` 配置正确
- 确认环境变量已在 EdgeOne 控制台同步
- 确认 `.env*` 文件未被提交到 Git
- Push 到 `main` 分支触发自动部署，或使用 EdgeOne CLI: `edgeone pages deploy`

## Git Workflow

- 从 `main` 分支，前缀 `feat/`、`fix/`、`chore/`
- Commit 消息：Conventional Commits 格式（`feat(video): add preview component`）
- Squash merge PRs
- PR 需要通过 CI 和至少一次审查

## Boundaries

### ✅ Allowed without asking

- 读取文件、列出目录
- 运行 `pnpm lint`、`pnpm tsc --noEmit`、单文件测试
- 修改 `src/` 下的业务代码
- 修改 `src/app/` 下的路由文件
- 修改 `src/components/ui/` 下的 UI 组件
- 在 `src/app/_dev/` 下创建调试页面

### ⚠️ Ask first

- 安装或删除依赖（`pnpm add` / `pnpm remove`）
- 删除文件
- 修改 `next.config.ts`
- 修改 `edgeone.json`
- 修改 `tsconfig.json` 或 ESLint 配置
- Push 到 Git 或创建 PR

### 🚫 Never

- 提交 `.env*` 文件或任何密钥/凭据
- Force push 到 `main` 或受保护分支
- 修改 `out/`、`.next/`、`.edgeone/` 构建产物
- 修改 `pnpm-lock.yaml`（只通过 `pnpm install` 间接修改）
- 把超过 25 MB 的文件放入 `public/`
- 在 `next.config.ts` 中使用 `rewrites` 或 `redirects`（用 `edgeone.json`）
- 使用 `middleware.ts`（已废弃，用 `proxy.ts`）
- 使用 Pages Router（`pages/` 目录）
- 将 `src/app/_dev/` 中的代码导入到正式路由或组件中（单向引用：`_dev/` → 正式，禁止反向）

## Key Files

- `AGENTS.md` — AI 编码代理操作策略（本文件）
- `next.config.ts` — Next.js 配置（output/images/trailingSlash）
- `edgeone.json` — EdgeOne 部署配置（build/redirects/headers/cloudFunctions）
- `src/app/layout.tsx` — 根 layout（必须含 `<html>` `<body>`）
- `src/app/globals.css` — 全局样式入口
- `proxy.ts` — 网络边界代理（替代 middleware.ts）
- `instrumentation.ts` — 监控/性能追踪
- `.env.example` — 环境变量模板（真实 `.env*` 不提交）
- `docs/README.md` — 文档目录索引
- `scripts/README.md` — 脚本目录索引
