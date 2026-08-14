# Next.js 16.2+ 关键模式与陷阱

> 本文档是 `AGENTS.md` 中 "Non-Obvious Patterns" 的完整版。
> AI 编码代理在写 Next.js 路由/配置代码前必须先读本文档。
> Next.js 16 有破坏性变更，API 和约定可能与训练数据不同——写代码前以本文档为准。

## proxy.ts 替代 middleware.ts

- 文件名是 `proxy.ts`，不是 `middleware.ts`（后者已废弃）
- 导出 `proxy` 函数，不是 `middleware`
- 运行时固定 `nodejs`，不支持 `edge` runtime
- 配置项 `skipMiddlewareUrlNormalize` 已改名 `skipProxyUrlNormalize`

## Async Request APIs（强制异步）

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

## Turbopack 是默认构建器

- `pnpm dev` 和 `pnpm build` 默认使用 Turbopack，无需 `--turbopack` 标志
- 如果有自定义 `webpack` 配置，构建会直接失败
- 解决：迁移到 Turbopack 选项，或使用 `--webpack` 回退

## Static Export (SSG) 配置

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

## cacheComponents 替代 experimental.ppr

- 旧的 `experimental.ppr` 已移除
- 使用 `cacheComponents: true` 开启 Partial Prerendering

## adapterPath 升为顶层配置

- 16.2 起 `adapterPath` 从 `experimental` 升级为顶层配置项
- 不再写 `experimental.adapterPath`

## Route Segment Config

可在 `page.tsx` / `route.ts` 顶部导出：

```ts
export const runtime = 'nodejs'        // 或 'edge'
export const maxDuration = 60          // 秒，不超过 EdgeOne Cloud Function 限制
export const preferredRegion = 'auto'  // 或 'global' / 'home'
export const dynamicParams = true
```

## 其他约定

- `error.tsx` 必须是 Client Component（`'use client'`）
- `route.ts` 和 `page.tsx` 不能共存于同一目录
- `generateStaticParams()` 用于动态路由静态化
- `metadata` / `generateMetadata()` 替代旧版 `head.tsx`
- `next/link` 的 `transitionTypes` prop 支持 View Transitions（16.2+）
