# EdgeOne Pages 部署配置规范

> 本文档记录 EdgeOne Pages 部署配置的正确写法、踩过的坑、以及防错规则。
> AI 编码代理在修改 `edgeone.json` 前必须先读本文档。

## 部署架构概览

```
本地 pnpm build → out/ 静态产物 → push main → EdgeOne 自动拉取仓库
  → EdgeOne 执行 installCommand → 执行 buildCommand → 上传 out/ → 部署
```

- **双运行模式**：本地 `pnpm dev` 开发 + 线上 EdgeOne Pages SSG 部署
- **构建产物**：`out/` 目录（由 `next.config.ts` 的 `output: 'export'` 决定）
- **触发方式**：push 到 `main` 分支自动部署，或 `edgeone pages deploy` 手动部署

## edgeone.json 字段规范

### buildCommand — 必须走包管理器脚本

**正确写法：**
```json
"buildCommand": "pnpm run build"
```

**错误写法（会导致部署失败）：**
```json
"buildCommand": "next build"
```

#### 根因分析（踩坑记录 2026-08-14）

EdgeOne 构建环境用 `sh -c "<buildCommand>"` 直接执行配置中的命令。这个执行路径**不会把 `node_modules/.bin` 注入 PATH**。

- `next` 二进制安装后位于 `node_modules/.bin/next`，不在系统 PATH 中
- 裸命令 `next build` → `sh: line 1: next: command not found` → exit code 127 → 构建失败
- 本地 `pnpm build` 能成功，是因为 pnpm 的 npm-scripts 机制会临时把 `node_modules/.bin` 注入 PATH；EdgeOne 直接 `sh -c` 没有这层包装

**可接受的等价写法**（都会自动解析本地 `node_modules/.bin`）：
- `pnpm run build` ✅（推荐，与 `package.json` scripts 对齐）
- `pnpm exec next build` ✅
- `npx next build` ✅

**禁止写法：**
- `next build` ❌
- `next-build` ❌
- 任何不经过包管理器/node_modules 解析的裸命令 ❌

### installCommand

```json
"installCommand": "pnpm install"
```

本项目锁定 pnpm，不要改成 `npm install` 或 `yarn`。

### outputDirectory

```json
"outputDirectory": "out"
```

SSG 模式下 Next.js 输出到 `out/`，不是 `.next/`。这个值由 `next.config.ts` 的 `output: 'export'` 决定，两者必须一致。

### nodeVersion

```json
"nodeVersion": "22.11.0"
```

锁定 EdgeOne 预装版本，不要随意升级。

### cloudFunctions — 新字段格式

**正确写法：**
```json
"cloudFunctions": {
  "maxDuration": 30,
  "regions": { "mainland": ["ap-guangzhou"] }
}
```

**错误写法（已 DEPRECATED，未来版本会移除）：**
```json
"cloudFunctions": {
  "mainlandRegions": ["ap-guangzhou"],
  "nodejs": { "maxDuration": 30 }
}
```

#### 字段迁移对照表

| 旧字段（废弃） | 新字段 | 说明 |
|---|---|---|
| `cloudFunctions.nodejs.maxDuration` | `cloudFunctions.maxDuration` | 升为顶层 |
| `cloudFunctions.mainlandRegions` | `cloudFunctions.regions.mainland` | 移入 regions 对象 |

旧字段目前只是 DEPRECATED 警告（会被自动映射），但未来版本会移除，**新写配置时必须用新格式**。

### redirects / rewrites / headers

- Next.js 原生 `rewrites` / `redirects` 在 SSG 模式下不可用，**必须写到 `edgeone.json`**
- `headers` 用于设置缓存策略和安全头
- 静态资源 `/_next/static/*` 设置长缓存：`public, max-age=31536000, immutable`

## 硬性限制

| Constraint | Limit |
|---|---|
| 单文件大小 | ≤ 25 MB |
| 项目总文件数 | ≤ 20,000 |
| 总存储 | ≤ 5 GB |
| 构建超时 | 20 分钟 |
| Cloud Function 包大小 | ≤ 128 MB |
| Cloud Function 请求体 | ≤ 6 MB |
| Cloud Function 最大执行时长 | 30s 默认，120s 可配置 |
| Edge Function 包大小 | ≤ 5 MB |
| Edge Function 请求体 | ≤ 1 MB |
| Edge Function CPU 时间片 | 200 ms |

## 部署前检查清单

修改 `edgeone.json` 或部署相关配置后，推送前必须确认：

1. **本地 `pnpm build` 通过** — EdgeOne 构建环境与本地不完全等价，配置错误只在部署时暴露，本地验证是第一道防线
2. **`out/` 目录存在且无超过 25 MB 的文件** — `Get-ChildItem out -Recurse | Where-Object Length -gt 25MB`
3. **`edgeone.json` 配置正确** — `buildCommand` 是 `pnpm run build`，`cloudFunctions` 用新字段格式
4. **环境变量已在 EdgeOne 控制台同步** — `NEXT_PUBLIC_` 前缀进客户端，敏感信息不带前缀
5. **`.env*` 文件未被提交到 Git** — 检查 `.gitignore` 覆盖完整

## 故障排查

### `sh: next: command not found` (exit code 127)

**根因：** `buildCommand` 写成了裸命令 `next build`，EdgeOne 的 `sh -c` 执行路径不注入 `node_modules/.bin`。

**修复：** 改成 `pnpm run build`。详见上文 buildCommand 章节。

### `[DEPRECATED] cloudFunctions.nodejs.maxDuration` / `cloudFunctions.mainlandRegions`

**根因：** 使用了已废弃的旧字段格式。

**修复：** 迁移到新字段（`cloudFunctions.maxDuration` / `cloudFunctions.regions.mainland`）。详见上文 cloudFunctions 章节。

### `No server-handler detected, generating routes.json for pure project` + `Build error`

**根因：** 通常是前一步 `buildCommand` 失败导致 `out/` 没有产物，EdgeOne 回退到纯静态项目路径但又找不到 bundle 文件。这是**连锁反应，不是独立根因**——修好 `buildCommand` 后自动消失。

### 构建超时（20 分钟）

**排查方向：**
- 检查是否有大量动态路由未做 `generateStaticParams` 优化
- 检查 `public/` 是否误放大文件（应走 COS/CDN）
- 检查依赖是否过多导致 install 阶段超时

## 相关文件

- `edgeone.json` — 部署配置（本文档约束的对象）
- `next.config.ts` — Next.js 配置（`output: 'export'` + `images.unoptimized` + `trailingSlash`）
- `AGENTS.md` — AI 编码代理操作策略（含本文档的精简防错条款）
- `package.json` — `scripts.build` 必须与 `edgeone.json` 的 `buildCommand` 对齐
