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

#### `source` 匹配规则的硬约束（写安全头前必读）

`source` 是 URL 路径匹配，**不是文件系统 glob**：

| 类型 | 示例 | 说明 |
|---|---|---|
| 精确路径 | `/api/hello` | 只匹配该路径 |
| 占位符 | `/articles/:id` | 匹配单级路径参数 |
| 通配符 | `/assets/*` | 匹配任意后续内容 |
| 带后缀通配 | `/assets/*.png` | 匹配该目录下的 PNG |

三条容易踩的限制：

1. **`source` 中最多含一个 `*`** —— `/blog/*/embeds/*` 是非法写法。需要按目录层级下钻做例外时，只能把资源落位到单一前缀（本项目的 `embeds/` 因此固定为 `/embeds/*`，见 [project-structure.md](../conventions/project-structure.md)）。
2. **header `value` 长度下限是 1，不能为空** —— 无法用空值「删掉」更宽规则里已设的响应头。更具体路径上的规则是**按 key 覆盖**，不是整段替换。想去掉 `/*` 上的 `X-Frame-Options: DENY`，只能在子路径上把同一个 key 覆盖成别的值（如 `SAMEORIGIN`）。
3. **`headers` 规则最多 30 条** —— 不能给每篇文章写一条精确路径。

响应头只在 EdgeOne 边缘生效：`pnpm dev` 与 `pnpm preview` 都读不到 `edgeone.json`，本地 Playwright 断言不到真实响应头。安全头的真实校验必须在部署后对公网 URL 做（`curl -I`）。

## 硬性限制

| Constraint | Limit |
|---|---|
| 单文件大小 | ≤ 25 MB |
| 项目总文件数 | ≤ 20,000 |
| `headers` 规则数 | ≤ 30 |
| `redirects` / `rewrites` 规则数 | ≤ 100 |
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

### `write-anchor-manifests.test.ts` 在 5000ms 超时

**现象：** Next.js 已经编译成功，TypeScript 检查通过，所有静态页面也已生成，但 `pnpm run build` 在自动执行 `postbuild` 时失败：

```text
× writes a read-only anchor manifest beside every generated article 5005ms
→ Test timed out in 5000ms.
```

**根因：** 这是全站生成型集成测试，不是常数时间的单元测试。它会重新扫描内容资产、编译每篇已发布文章，并为每篇文章写入 `anchor-manifest.json` 和 `export-source.json`。工作量会随文章数量和正文长度增长，EdgeOne 共享构建机可能比本地慢；Vitest 默认的 5 秒单测试上限因此会造成假失败。

**判断方法：** 如果日志只报告精确贴近 5000ms 的 timeout，没有内容 diagnostic、文件缺失、路径越界或写入错误，则应先按运行时预算问题处理。后续的 `No server-handler detected` 和 `bundle file not found` 仍然是 `postbuild` 返回非零后的连锁提示。

**修复约束：**

- 只给这个全站集成测试设置显式、有上限的超时，当前使用 30 秒。
- 不要全局放宽 Vitest 的所有测试，避免掩盖其他死循环或性能回归。
- 不要通过跳过 `postbuild`、删除断言或 `--no-verify` 绕过构建门禁。
- 如果未来真实执行时间持续接近 30 秒，应优化重复的资产扫描与文章编译，而不是继续无上限提高 timeout。

#### 故障记录（2026-08-31）

四篇长篇超级富文本文章入库后，EdgeOne 成功完成依赖安装、Next.js 编译、TypeScript 检查与 54 个静态页面生成，但全站锚点 sidecar 生成在 5005ms 被 Vitest 默认超时终止。同一测试本地核心执行约 2.4 秒，而云端同组内容资产测试比本地慢约 84%，证实这是构建机性能差异与目录增长共同触发的时间预算问题，不是文章、HTML embed、EdgeOne 配置或静态导出失败。

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
