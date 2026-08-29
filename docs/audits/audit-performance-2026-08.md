# 性能预算实测 — 2026-08

按规格 13.2 与 issue #77 复测。**未改**规格 13.2 预算表。字体超标只记录选项，留给人拍板。

## 测量环境（#77 / 2026-08-21）

| 项 | 值 |
|---|---|
| 日期 | 2026-08-21（UTC+13） |
| OS | Windows 10 系（10.0.26200）+ PowerShell 5.1 |
| 本地 Node | 构建机 Node 以仓库锁定 22.11.0 为准；本轮命令在现有 `node_modules` 上跑 |
| 分支 | `chore/night-run-20260821`（基线 `origin/dev` @ `e8310a6`） |
| 测量页 | `/blog/p0-kitchen-sink/` |
| 正式 JS 口径 | 无 `ANALYZE` 的 `pnpm build`（Turbopack）→ 扫 `out/` gzip |
| analyzer 口径 | `$env:ANALYZE='true'; pnpm build`（强制 `--webpack`，否则 Turbopack 下 analyzer 静默跳过） |
| gzip 方法 | Node `zlib.gzipSync` 压 `out/` 中 HTML 实际引用的文件 |
| 字体 | 字体不进 `out/`；CSS 结构直接拉 ZeoSeven `result.css`；传输量见下方 HAR / #35 |
| 9982 vs 9981 | 预算看静态产物。`pnpm preview` 用 `serve out -l 9982`，**不启用 gzip，也不读 `edgeone.json` 响应头** |

## 预算对照（#77 复测）

| 预算项 | 上限（压缩后） | 实测 | 判定 |
|---|---:|---:|---|
| 文章页首屏 JavaScript | 204,800 B | **183,155 B**（排除 `nomodule`）/ 222,782 B（含 `nomodule` 39,627 B） | **现代 Chromium 达标**（余 21,645 B）。含 `nomodule` 仍超 17,982 B，口径待人确认，见 [待拍板](#待拍板) |
| 文章页首屏字体 | 307,200 B | 接入仍是 ZeoSeven ID 285；`result.css` 672 个 `@font-face` **全部带 `unicode-range`**，字重轴 `200 900`，`font-display: swap`。#35 HAR 1,812,936 B；#48 HAR 1,927,521 B。本轮 CSS 解压 289,115 B | **未达标**。不是「没拿到切片 / 整包单文件」，而是可变轴 CJK 切片命中总量远超 300 KB。**不改预算表** |
| 单张文章图片 | 307,200 B | 沿用 #48：首屏图均 ≤ 1,509 B | 达标 |
| 讨论面板打开后追加 | 307,200 B | 解析器 chunk `2jsq-cwm1u7qo.js` gzip **57,159 B**（含 `sanitizeDiscussion` / `validateDiscussionWrite`），**不在**首屏 HTML。zod `0_c91ipqc8u22.js` gzip 64,581 B、KaTeX `1ccrv6ivbw_37.js` gzip 76,981 B 同为 async，不在首屏 HTML | 讨论追加远低于 300 KB |
| 首页 3D | 409,600 B（不计入首屏） | 阅读页首屏 chunk **不含** `three` / `react-three` | 未计入阅读首屏 |
| 导出运行时 | 不设上限 | 未点「开始导出」 | 未测点击后体积 |

「压缩后」= gzip 字节。200 KB = 200 × 1024 = 204,800 B。

基线（#48 @ `8691f68`）：首屏 JS 367,245 / 327,618 B；讨论解析在首屏图内。本轮现代口径从 327,618 降到 183,155（约 0.56×）。

## 首屏 JS（Turbopack `out/` gzip）

来源：`out/blog/p0-kitchen-sink/index.html` 的 `<script src>` + `rel="preload" as="script"`。同一 URL 只计一次。

| 文件 | raw | gzip | 备注 |
|---|---:|---:|---|
| `/_next/static/chunks/2079pqoyb78td.js` | 234,412 | 73,324 | React/Next 基线量级 |
| `/_next/static/chunks/394nl960hxq00.js` | 165,971 | 45,193 | |
| `/_next/static/chunks/0cz1d0mv5g_q7.js` | 112,594 | 39,627 | `noModule`，现代 Chromium 不下载、不执行 |
| `/_next/static/chunks/2ncgxfaipo6t_.js` | 44,093 | 14,159 | 含 `createTextAnchor`；`validateDiscussionWrite` 仅为动态 `import()` 字符串，不是解析器本体 |
| `/_next/static/chunks/0nu31a1w4dmr3.js` | 40,482 | 11,789 | 注释面板槽的异步入口（`AnnotationPanel` 标识）；默认页签是「注释」，故仍出现在首屏 HTML 的 `async` script 列表 |
| `/_next/static/chunks/3zgzy8xsrt0ve.js` | 34,588 | 11,425 | |
| `/_next/static/chunks/24er9tgz4oo_0.js` | 28,467 | 7,627 | preload + script，只计一次 |
| `/_next/static/chunks/2mvbud2-ju_n_.js` | 23,364 | 7,098 | |
| `/_next/static/chunks/turbopack-349_m7lg6ss9q.js` | 10,843 | 4,267 | |
| 其余 5 个 chunk | 19,474 | 8,273 | |
| **现代合计（排除 nomodule）** | **601,694** | **183,155** | |
| **含 nomodule** | **714,288** | **222,782** | |

首屏 HTML **没有**引用：

- `2jsq-cwm1u7qo.js`（gzip 57,159，讨论解析 / `sanitizeDiscussion` / `validateDiscussionWrite` 实现）
- `0_c91ipqc8u22.js`（gzip 64,581，zod，随测验叶子视口加载）
- `1ccrv6ivbw_37.js`（gzip 76,981，KaTeX 运行时；文章公式仍是构建期 HTML）
- `unified` / `remark-parse` 字符串未出现在任何首屏 chunk

这对应架构 D20 / 规格 13.1：「未打开的讨论面板不加载解析器」。默认工作区页签是「注释」，面板壳在 hydration 后加载；**解析器只在条目卡片挂载时 `import()`**。

## `@next/bundle-analyzer` 逐 chunk 归因

已接入：

- 依赖：`@next/bundle-analyzer@16.3.1`（devDependency）
- `next.config.ts`：仅当 `ANALYZE=true` 时包裹 analyzer（`openAnalyzer: false`），并给 webpack 的 css-loader 把 CSS Modules `pure` 改成 `local`，否则 `:global(...)` 在 ANALYZE 构建里失败
- `scripts/build/run-next-build.mjs`：`ANALYZE=true` 时追加 `next build --webpack`。默认 `pnpm build` 仍走 Turbopack，analyzer 在 Turbopack 下会静默跳过
- 报告副本：`.tmp/analyze/client.html`（webpack 产物，**哈希与 Turbopack `out/` 不同**，只用来看模块组成，不用来替代 13.2 gzip 数字）

webpack client 体积最大的模块（gzip，全站 client 图，**不是**阅读首屏）：

| 模块 | gzip | 是否进入阅读首屏 HTML |
|---|---:|---|
| `three.core.js` / `three.module.js` | 99,862 / 87,093 | 否（首页 3D） |
| `katex.mjs` | 76,381 | 否（async；文章公式构建期渲染） |
| `react-dom-client.production.js` | 63,103 | 是（基线） |
| `@react-three/fiber` events | 46,093 | 否 |
| `gsap-core.js` + ScrollTrigger | ~33,729 | 绳挂导航在阅读页，会计入首屏 |
| `purify.es.mjs`（DOMPurify） | 10,419 | 否（Mermaid / 讨论 sanitize 的 async 图） |
| `zod` schemas | ~9,030 | 否（测验叶子视口加载） |
| `sanitize-discussion.ts` 与 compile-document 拼接 | 5,468 | 否（讨论解析 async chunk） |

结论：阅读首屏的大头仍是 React/Next + 阅读壳（目录、工作区、划词锚点、绳挂 GSAP），不是讨论解析器、不是 three、不是 KaTeX 运行时。

复现：

```powershell
pnpm build
node .tmp/measure-first-screen.mjs
node .tmp/scan-chunks.mjs
$env:ANALYZE='true'; node scripts/build/run-next-build.mjs; Remove-Item Env:ANALYZE
```

ANALYZE webpack 构建会改写 `out/`；取正式数字前必须再跑一次无 ANALYZE 的 `pnpm build`。

## 字体

- `out/` 内 **没有** 思源宋体 / ZeoSeven 文件。`out/vendor/katex/fonts/` 仍是 KaTeX 数学字体，不属于 13.2「中文云字体切片」口径。
- 接入未回退 #35：`CloudSerifFont` 仍在 hydration 后往 `<head>` 插入 `@import`，**没有**把 `@import` 写回 `globals.css`。
- 2026-08-21 直接拉取 `https://fontsapi.zeoseven.com/285/main/result.css`：

| 项 | 值 |
|---|---|
| CSS 解压体积 | 289,115 B |
| `@font-face` 数量 | 672 |
| 带 `unicode-range` | **672 / 672** |
| `font-weight` | 全部 `200 900`（可变轴，不是单字重静态文件） |
| `font-display` | 全部 `swap` |
| 字体 URL | 672 个不同 `.woff2`（相对路径切片，不是一个整包文件） |

#48 在 9982 上的 HAR：`result.css` 289,053 B + 37 个 woff2，合计 **1,927,521 B**。#35 CDP：CSS 网络 76,055 B + 38 个 woff2 1,736,881 B，合计 **1,812,936 B**。综合验收文字符集大，浏览器会按 `unicode-range` 拉多片；每片还是 200–900 可变轴，所以总量落在 ~1.8–1.9 MB，不是「没切」。

2026-08-21 本机 Playwright Chromium 访问 9982：`CloudSerifFont` 已注入 `#cloud-serif-font`（hydration 后 `@import`，未进 `globals.css`），但对 `https://fontsapi.zeoseven.com/285/main/result.css` 得到 **GET 204 空体**，woff2 请求 0。同日非浏览器直拉该 CSS 成功（289,115 B / 672 faces）。因此本轮没有新的可用 HAR 传输量，字体字节沿用 #35/#48；204 不能当成「字体变轻」。

规格 13.3 禁止按站内已用字整体裁剪（讨论字符集构建期不可知），因此不能靠子集化文章用字来塞进 300 KB。三选一建议写在 #77 评论，**不改本审计也不改规格 13.2**。

## `out/` 产物上限

| 项 | 实测 | 上限 |
|---|---:|---|
| 文件数 | 234 | 20,000 |
| 单文件最大 | 3,569,667 B（`out/embeds/_runtime/mermaid/mermaid.min.js`） | 25 MB |
| >25 MB 文件 | 0 | 0 |

## 相对 #48 改了什么（代码，不是预算）

1. 讨论解析：`validateDiscussionWrite` / `sanitizeDiscussionRead` 改为函数内 `import()`；注释面板改为 `useEffect` + `import('@/features/annotations/annotation-panel')`。不要用顶层 `next/dynamic`——仍会进首屏 HTML `<script>`。
2. Canvas / Mermaid / 选择题 / 填空 / 注册叶子改为视口内 `import()`。HTML/Web embed 保持 eager SSR（单测要沙箱与替代说明）。
3. 拆掉会把 DOMPurify / zod 误打进首屏的 security / renderer 桶导出。
4. 接入 bundle analyzer；默认构建仍是 Turbopack。

## 待拍板

1. **首屏 JS 是否计入 `nomodule` polyfill**。排除则 183,155 B 达标；计入则 222,782 B，超约 18 KB。本轮不把失败测试改宽，也不改预算数字。
2. **云字体 300 KB**。当前切片分发已符合 13.3 字面要求，但可变轴 CJK 命中总量约 6× 预算。选项见 #77 评论。

## 2026-08-16 基线（#48，已关闭）

当时降级路径：不安装 `@next/bundle-analyzer`，不改 `next.config.ts`，不改规格 13.2。超标只记录。分支 `feat/p0-m8` @ `8691f68`。

| 项 | 当时实测 |
|---|---|
| 阅读页首屏 JS gzip | 367,245 B（含 nomodule）/ 327,618 B（排除 nomodule） |
| 最大 JS chunk | `2yivfbcp_1ihw.js` gzip 134,267，含 mermaid / katex / Discussion 字符串 |
| 讨论 | 相关代码已在首屏 script 列表，打开注释几乎不再拉解析器 |
| 云字体 9982 HAR | 1,927,521 B |
| `out/` | 189 文件 / 最大 3.57 MB |

`pnpm build` + postbuild（3/3）当时通过。原始网络 JSON 曾落在 `.tmp/preview-network.json`。
