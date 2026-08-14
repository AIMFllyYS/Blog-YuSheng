# Code Review 检查清单

> 本文档是 `AGENTS.md` 中 "When Reviewing Code" 的完整版。
> AI 编码代理在进行 code review 或自我审查时按本清单逐项检查。

## 文件组织与职责

- 检查文件/函数是否过长且未按职责拆分（关注职责混杂与自然接缝，而非行数本身）
- 检查文件放置是否符合 colocation 原则：单路由专用代码是否被错误地提升到 `src/features/`（应留在路由内）；跨路由领域模块是否还散落在各路由里（应提升到 `src/features/`）

## Next.js 16 合规

- 检查是否有 `'use client'` 被过度使用（应只在叶子组件）
- 检查 `params` / `searchParams` 是否正确 `await`
- 检查是否有 `middleware.ts` 残留（应为 `proxy.ts`）
- 检查 `next.config.ts` 是否包含 `output: 'export'` + `images.unoptimized` + `trailingSlash`

## EdgeOne 部署合规

- 检查是否有大文件被放入 `public/`
- 检查 `edgeone.json` 的 `outputDirectory` 是否为 `"out"`
- 检查 `edgeone.json` 的 `buildCommand` 是否为 `pnpm run build`（禁止裸命令 `next build`）
- 检查 `edgeone.json` 的 `cloudFunctions` 是否用新字段格式（`maxDuration` 顶层 + `regions.mainland`）
- 检查是否有 `rewrites` / `redirects` 写在 `next.config.ts` 中（应移到 `edgeone.json`）

## _dev/ 隔离

- 检查 `src/app/_dev/` 页面是否有 `NODE_ENV === 'production'` 守卫
- 检查是否有正式代码引用了 `src/app/_dev/` 中的内容（应单向引用）
