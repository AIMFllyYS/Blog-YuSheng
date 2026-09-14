# 小日报投递契约（publish-daily-brief）

> 面向云端 Grok Bot 的自动化流程与人工补投：每天一份自包含 HTML 日报，经 PR 落到 `content/briefs/`，
> 合并后 EdgeOne 自动构建部署，`/daily/` 台历与 `/daily/<date>/` 阅读台随之更新。
> 本文是**唯一契约**，自动化脚本请照抄，不要另行发挥。

## 1. 投递路径与文件名

```text
content/briefs/<YYYY-MM>/ai-brief-<YYYY-MM-DD>.html
```

- 目录按月归档（`2026-09/`）。发现逻辑递归扫描整个 `content/briefs/`，也容忍平铺，但**新投递一律按月放**。
- 文件名**末尾**必须是 `YYYY-MM-DD.html`（前缀 `ai-brief-` 可保留），日期即路由参数：`/daily/2026-09-14/`。
- 日期取「上海日历日」，与原件 `<title>` 里的日期一致；不要用 UTC 日期。
- 同一天只能有一份。重复日期、非法日期（如 `2026-02-30`）、无日期文件名都会让 `pnpm build` 失败，PR 的 CI 会红。
- 单文件 ≤ 25 MB（EdgeOne 硬限制），UTF-8 编码，必须自包含：**不得引用站外脚本 / 样式 / 字体**，图片优先内联 data URI。
- 缺日不用补空文件，台历自动显示为虚线空格；前后日按存在的日期跳。

## 2. 元数据

| 项 | 必需 | 用途 | 解析规则 |
|---|---|---|---|
| `<title>` | 是 | 阅读台报头条、`<title>`、OG | 全文；缺失时回退 `折晓早报 · <date>` |
| 短标题（headline） | 自动 | 台历小报卡、头版、期号标题 | 优先 DESIGN LESSON 的 `TITLE:`（去掉《》），否则把 `<title>` 按 `·` 切开，剔除日期与品牌片段后取第一段，≤ 40 字 |
| `<!-- DESIGN LESSON -->` 块 | 否 | 头版导语、周抽出时的大卡副文、chips | 见下 |

DESIGN LESSON 块放在 `</html>` 之前，每行 `KEY: 值`，只识别这四个键：

```html
<!--
DESIGN LESSON 2026-09-14 折晓早报
STYLE: 剪纸/折纸 layered kraft
GENRE: 手风琴折页 zine
TITLE: 《注资轨》 (Funding Track)
THESIS: 口头缓行，轨道上仍在加注
-->
```

- `THESIS` 会出现在头版与周抽出大卡上，建议 ≤ 40 字一句话。
- `STYLE` / `GENRE` 以小 chips 显示在阅读台页脚。
- 块不存在时一切正常，只是少了导语。

## 3. 原件的运行环境（沙箱）

原件在阅读台里以 iframe 嵌入：

```html
<iframe
  src="/briefs/<date>.html"
  sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
  referrerpolicy="no-referrer"
/>
```

对原件的含义：

- **可以**：内联 `<script>`、CSS 动画、键盘交互（方向键翻页等）、`target="_blank"` 外链（会新开标签）。
- **不可以**：`localStorage` / `sessionStorage` / `cookie` / `fetch` 同源资源 / `postMessage` 依赖宿主——沙箱没有 `allow-same-origin`，这些会抛异常。原件里若必须用存储，请 try/catch 兜底。
- **不需要**：文章 `embeds/` 那套 nonce 握手协议。日报走独立路径，宿主不会向 iframe 发送任何消息。
- 布局按 `100vh` 舞台式设计即可：阅读台把整块纸面（≥ 560px，通常 `100svh − 13.5rem`）都交给原件，内部滚动由原件自理；用户还可以「全屏展报」。
- 直接访问 `/briefs/<date>.html` 也是合法的（阅读台的「原件 ↗」按钮），所以原件单独打开时也应可用。

## 4. 构建期发生了什么

1. `src/server/briefs/discover-briefs.ts` 扫描 `content/briefs/**`，解析日期、`<title>`、DESIGN LESSON，校验重复 / 大小 / 编码；任何一条不合格都抛 `BriefBuildError` 并列出全部问题。
2. `/daily/` 用整份清单渲染台历；`/daily/<date>/` 用 `generateStaticParams` 全量静态化（`dynamicParams = false`）。
3. postbuild（`scripts/build/run-brief-assets.test.ts`）把原件**原样**复制到 `out/briefs/<date>.html`，并断言路由页已经指向该地址。
4. `edgeone.json` 为 `/briefs/*` 单独设置 `X-Frame-Options: SAMEORIGIN` 与
   `Content-Security-Policy: frame-ancestors 'self'; sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox`。其它路径仍是全站 `DENY`。

本地验证：

```powershell
pnpm vitest run tests/unit/discover-briefs.test.ts   # 契约单测（含真实 content/briefs 扫描）
pnpm build                                            # 含 postbuild 复制
pnpm preview                                          # 9982，打开 /daily/ 与 /daily/<date>/
```

开发态 `pnpm dev` 打开任一 `/daily/<date>/` 时会把该原件镜像到 `public/briefs/`（已 gitignore）。

## 5. Bot PR 规范

- 基线：从**最新** `origin/main` 切分支，不要从过期的本地 `main` / `dev` 切。
- 分支：`chore/brief-<YYYY-MM-DD>`；只改动**一个新增文件**（当天的 HTML）。
- Commit / PR 标题：`content(briefs): add 2026-09-14 daily brief`（Conventional Commits，scope 固定 `briefs`）。
- PR **base 必须是 `main`**。正文附 `<title>` 与 THESIS 一行，便于人眼扫。
- 不改 `src/`、`docs/`、锁文件、`edgeone.json`；不删除历史日报。历史地址一经发布不改，改名需先在 `edgeone.json` 配 redirect。
- 禁止 force push、禁止 `--no-verify`、禁止改 `pnpm-lock.yaml`。
- CI 绿后 **squash merge** 进 `main`（可删远程投递分支）。然后把更新后的 `origin/main` **合并进 `dev`** 并推送，使两条线都拿到当天日报。不要反向把旧 `dev` 合进 `main`。
- 合并后 EdgeOne 跟 `main` 构建。若构建失败，看 EdgeOne 日志里的 `BriefBuildError` 列表（见 [deploy-edgeone.md](deploy-edgeone.md)）。

## 6. 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| `同一天出现两份日报` | 同日重复投递或补投未删旧文件 | 删掉多余那份再推 |
| `文件名末尾必须是 YYYY-MM-DD 合法日期` | 文件名少日期 / 日期溢出 | 改名 |
| `日报超过单文件 25 MB 上限` | 内联了大图或视频 | 压缩图片、去掉视频、改外链 |
| `日报必须是 UTF-8 编码` | 生成端用了 GBK / UTF-16 | 转码为 UTF-8（无 BOM） |
| 阅读台 6 秒后显示「原件未能在此展开」 | 原件在沙箱里抛异常阻断渲染、或路径不对 | 直接打开 `/briefs/<date>.html` 看控制台；检查存储 / fetch 调用 |
| 外链点了没反应 | 原件用 `window.open` 而非 `target="_blank"` | 两者都受 `allow-popups` 支持；确认不是被浏览器拦截弹窗 |
