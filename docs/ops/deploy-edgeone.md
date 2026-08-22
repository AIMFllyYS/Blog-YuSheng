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

#### 文章资产必须在构建脚本内物化，不能挂 postbuild（2026-08-22）

`pnpm run build` 指向 [scripts/build/run-next-build.mjs](../../scripts/build/run-next-build.mjs)，它按顺序做三件事，缺一件线上就少东西：

1. 清掉 `public/blog`、`public/media`、`public/embeds/<slug>`（dev 期的资产镜像，见下一节）。`output: 'export'` 会把 `public/` 原样拷进 `out/`，不清就会把已删除或改名的旧文件夹带进产物。
2. `next build` —— 只有退出码为 0 才继续。
3. 把文章资产与 anchor manifest 写进 `out/`。

**第 3 步曾经挂在 `package.json` 的 `postbuild` 上，这是个隐患，已移除。** `postbuild` 能不能跑取决于 pnpm 的 `enable-pre-post-scripts`（仓库无 `.npmrc`，走的是默认值）。一旦 EdgeOne 侧的 pnpm 版本或配置与本地不同，这一步会**静默跳过**：线上文章的图片、视频、音频、HTML embed 与 anchor manifest 全部消失，而 `pnpm run build` 仍然 exit 0，构建日志看不出任何异常。现在它是构建脚本里的显式步骤，与 pnpm 生命周期解耦。

改这个脚本时不要把资产步骤挪回 `postbuild`，也不要把它放到 `next build` 之前 —— `next build` 会重建 `out/`。

### 文章资产的公开 URL 与 dev 期镜像

三个顶级前缀由构建期产出，dev 期由渲染文章页时镜像到 `public/` 下同名目录：

| 前缀 | 内容 |
|---|---|
| `/blog/<slug>/...` | 文章包内的原始媒体、SVG、data JSON |
| `/media/<slug>/...` | 构建期生成的 avif/webp 响应式变体 |
| `/embeds/<slug>/<id>/` | 文章包内的 HTML 小页（含目录内全部传递资源） |

**html-embed 的入口 URL 必须是显式的 `/embeds/<slug>/<id>/index.html`，不要改回目录形式 `/embeds/<slug>/<id>/`。**

原因是 Next dev 与静态宿主对「目录」的处理不一致：EdgeOne 和 `pnpm preview`（`serve out`）都会把 `/a/b/` 解析成 `a/b/index.html`，但 Next dev 不会。它先剥掉尾斜杠，再要求命中一个真实**文件**（[filesystem.js](../../node_modules/next/dist/server/lib/router-utils/filesystem.js) 的 `itemPath.endsWith('/')` 剥离 与 `fileExists(fsPath, FileType.File)`），所以目录形式在本地一定 404。

这个 404 的代价远不止一张空白 iframe：dev 的 404 响应体是应用自己的 not-found 页面，它会被加载进 `sandbox="allow-scripts"` + `referrerPolicy="no-referrer"` 的 iframe（不透明源、无 Referer），于是它请求的每一个 `/_next/static/chunks/*` 都会触发一条 `Blocked cross-origin request to Next.js dev resource` 警告 —— 一次页面加载刷出十几二十条。这类警告**不能靠 `allowedDevOrigins` 解决**：这些请求要么没有任何可加白名单的 host，要么源就是 `null`。真正的修法是别让 embed 404。

入口文件名由 [html/schema.ts](../../src/features/doc-engine/renderers/html/schema.ts) 的 `.refine()` 锁死为 `./embeds/<id>/index.html`，所以显式 URL 是可静态推导的。`edgeone.json` 的 `/embeds/*` 规则对显式路径与目录形式的匹配面相同，无需调整。

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
6. **文章资产真的进了 `out/`** — 资产物化是构建脚本的第 3 步，漏跑时构建仍会 exit 0，必须单独抽查：
   ```powershell
   Test-Path out\blog\p0-kitchen-sink\media\images\cover.png,
             out\media\p0-kitchen-sink\cover-960.avif,
             out\embeds\p0-kitchen-sink\mini-card\index.html,
             out\blog\p0-kitchen-sink\anchor-manifest.json
   ```

### 部署后验证（本地无法代替）

响应头只在边缘生效，所以以下两项只能对公网 URL 做：

1. `curl -I https://<域名>/embeds/p0-kitchen-sink/mini-card/index.html` — 应返回 `X-Frame-Options: SAMEORIGIN`。如果拿到的是全局 `/*` 上的 `DENY`，说明边缘并不是「按 key 覆盖」（与本文 `source` 匹配规则一节的结论矛盾），此时 embed 会被浏览器拒绝嵌入，需要把全局 `X-Frame-Options` 改成只用 CSP `frame-ancestors` 分路径控制
2. 浏览器打开文章页，确认图/视/音正常且 embed 容器的 `data-embed-ready="true"`

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
