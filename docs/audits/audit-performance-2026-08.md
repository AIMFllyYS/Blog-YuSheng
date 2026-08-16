# 性能预算实测 — 2026-08

按 #48 降级路径记录：不安装 `@next/bundle-analyzer`，不改 `next.config.ts`，不改规格 13.2 预算表。超标只记录，留给人拍板。

## 测量环境

| 项 | 值 |
|---|---|
| 日期 | 2026-08-16（UTC）/ 2026-08-17（UTC+13） |
| OS | Windows 10 22H2 系（10.0.26200） |
| 本地 Node | v24.15.0（仓库锁定 22.11.0；CI 以 22.11.0 + frozen-lockfile 为准） |
| 分支 / SHA | `feat/p0-m8` @ `8691f68` |
| 测量页 | `/blog/p0-kitchen-sink/` |
| 命令 | `pnpm build` → 扫 `out/` gzip；`pnpm preview`（9982）+ Playwright 抓网络 |
| gzip 方法 | Node `zlib.gzipSync` 压 `out/` 中 HTML 实际引用的文件 |
| 9982 vs 9981 | 预算看静态产物。`pnpm preview` 用 `serve out -l 9982`，**不启用 gzip，也不读 `edgeone.json` 响应头** |
| bundle analyzer | **未测**（未授权 `@next/bundle-analyzer` / `next.config.ts`） |

## 预算对照

| 预算项 | 上限（压缩后） | 实测 | 判定 |
|---|---:|---:|---|
| 文章页首屏 JavaScript | 200 KB | **367,245 B gzip**（含 `nomodule` polyfill）/ **327,618 B gzip**（排除 `nomodule`） | **超标** |
| 文章页首屏字体 | 300 KB | 9982 传输 **1,927,521 B**（`result.css` + 37 个 woff2）；#35 记录 1,812,936 B | **超标**（与 #35 一致，不复测国内延迟） |
| 单张文章图片 | 300 KB | 首屏观察到的文章图均 **≤ 1,509 B**（`poster.png` 1,509；`safe-diagram.svg` 1,071；`cover-960.avif` 560） | 达标 |
| 讨论面板打开后追加 | 300 KB | 讨论相关代码已在首屏 JS 图内；打开「注释」几乎不再拉解析器。测量里追加的 3.6 MB 主要是随后滚入视口的 `mermaid.min.js`，不能记成讨论增量 | **首屏已预载讨论代码（毛刺）** |
| 首页 3D | 400 KB（不计入首屏） | 文章 HTML 未引用 `three` / `react-three` chunk | 未计入首屏 |
| 导出运行时 | 不设上限 | 未点「开始导出」，首屏 HTML 无 `assemble-export` 独立入口 | 未测点击后体积 |

「压缩后」= gzip 字节。200 KB 按 200 × 1024 = 204,800 B 计。

## 首屏 JS（`out/` gzip）

来源：`out/blog/p0-kitchen-sink/index.html` 的 `<script src>` + `rel="preload" as="script"`。同一 URL 只计一次。

| 文件 | raw | gzip | 备注 |
|---|---:|---:|---|
| `/_next/static/chunks/2yivfbcp_1ihw.js` | 524,137 | 134,267 | 含 mermaid / katex / Discussion 字符串 |
| `/_next/static/chunks/2079pqoyb78td.js` | 234,412 | 73,324 | React/Next 基线量级 |
| `/_next/static/chunks/394nl960hxq00.js` | 165,971 | 45,193 | |
| `/_next/static/chunks/0cz1d0mv5g_q7.js` | 112,594 | 39,627 | `nomodule`，现代 Chromium 不执行 |
| `/_next/static/chunks/2pw2t0yhq7mk0.js` | 72,311 | 22,196 | Discussion / Annotation |
| `/_next/static/chunks/3s6kxrjhklb58.js` | 35,655 | 13,524 | mermaid / DOMPurify |
| 其余 8 个 chunk | 117,043 | 39,114 | 含 preload 的 runtime |
| **合计** | **1,266,123** | **367,245** | |

首屏 CSS（不计入 JS 预算）：两份 Next CSS gzip 19,520 B；另有 `/vendor/katex/katex.min.css`。

文章 HTML 本身约 245,576 B（内联 RSC/正文），不计入 JS 预算，但是综合验收文的体积毛刺。

## Mermaid / 讨论懒加载

- 首屏网络：**没有**请求 `mermaid.min.js` / `sandbox-client` / `embeds/_runtime/mermaid/*`。
- 把 `#mermaid` 滚进视口后：加载 `renderer.html` / `renderer.js` / `mermaid.min.js`（磁盘 3,566,079 B）。符合「视口内懒加载」。
- 讨论：`2yivfbcp_1ihw.js` 与 `2pw2t0yhq7mk0.js` 已在首屏 script 列表里，打开注释面板不再拉一套解析器。这是相对 13.1「未打开的讨论面板不加载解析器」的毛刺，本轮不改代码（降级：记录，不改预算表）。

## 字体

- `out/` 内 **没有** 思源宋体 / ZeoSeven 文件。`out/vendor/katex/fonts/` 下 60 个 KaTeX 字体文件，不属于 13.2「中文云字体切片」口径。
- 9982 HAR：`fontsapi.zeoseven.com/285/main/result.css`（289,053 B）+ 37 个 woff2，合计 1,927,521 B。
- #35 已记录首屏字体 1,812,936 B 超 300 KB；境外测不了国内延迟。本轮引用该结论，不改预算表。

## `out/` 产物上限

| 项 | 实测 | 上限 |
|---|---:|---:|
| 文件数 | 189 | 20,000 |
| 单文件最大 | 3,566,079 B（`out/embeds/_runtime/mermaid/mermaid.min.js`） | 25 MB |
| >25 MB 文件 | 0 | 0 |

`pnpm build` + postbuild（3/3）通过。

## 复现

```powershell
pnpm build
node .tmp/measure-first-screen.mjs
pnpm preview
pnpm exec playwright test --config .tmp/playwright.preview.config.ts
```

`.tmp/` 脚本只用于本轮取数，不进入交付。原始网络 JSON：`.tmp/preview-network.json`。

## 超标清单（需人拍板）

1. **首屏 JS 超 200 KB**：HTML 同步引用了带 Discussion / mermaid 字符串的大 chunk。可选方向：讨论与导出继续拆动态 import；不授权 analyzer 前无法给出精确组成。
2. **云字体切片超 300 KB**：与 #35 同一问题。综合验收文字符集大，切片总和远超预算。
3. **预算表**：按降级路径 **未改** 规格 13.2。

不标 blocked。
