# 博客写作指南

> 给作者自己用的完整写作手册：一篇新文章写在哪、frontmatter 怎么填、正文能用哪些语法、图片和素材放哪、怎么预览、怎么改稿、怎么上线。
> 技术契约以 [博客内容引擎功能规格](../specs/blog-content-engine.md) 为准；目录归属以 [项目结构](../conventions/project-structure.md) 为准。格式拿不准时，对照 [content/posts/p0-kitchen-sink/index.md](../../content/posts/p0-kitchen-sink/index.md)。

## 先记住这六条

1. **一篇文章 = 一个文件夹。** 正式正本只有 `content/posts/<slug>/index.md`。评论、注释、导出附录都不是正本，不能写回这篇文章。
2. **slug 就是网址。** 文件夹名叫 `three-body`，公开地址就是 `/blog/three-body/`。frontmatter 里不要再写一遍 slug。
3. **新文章先选大方向。** `section` 必须是 `content/sections.yml` 里已登记的 slug。目录是两级：大方向是书，小博客是那本书里的一章；章节顺序由发布时间自动排，不要自创 `chapter` / `series` 字段。
4. **素材跟文章住在一起。** 图片、音视频、JSON、HTML 小页都放在该文章文件夹里，不要丢进 `public/` 或 `src/`。
5. **构建期会严格校验。** 缺字段、未知字段、未注册的板块、路径逃逸、文件不存在、图片超标，都会让 `pnpm build` 失败，线上也就发不出去。
6. **只有 `main` 会自动部署。** 日常写作在 `dev` 上完成；合进 `main` 之后，EdgeOne 才会更新公网站点。

---

## 1. 文章写在哪里

### 1.1 目录

```text
content/posts/<slug>/
├── index.md          ← 唯一正式正本（必须有）
├── data/             ← 问答题、Canvas 等 JSON
├── media/
│   ├── images/       ← 封面、插图、视频海报
│   ├── video/        ← mp4
│   ├── audio/        ← mp3
│   └── svg/          ← 独立 SVG
└── embeds/
    └── <embed-id>/
        ├── index.html
        └── assets/   ← 该小页自己的 css/js/图
```

- 新建文章：在 `content/posts/` 下建一个新文件夹，放入 `index.md`。`data/`、`media/`、`embeds/` 用到再创建，不必先建空目录。
- 删文章：删整个 `<slug>/` 文件夹，不要只删 `index.md` 留下一堆孤儿素材。
- 一篇文章的相对路径只能指向**自己的文件夹**。禁止 `../`、反斜杠、绝对路径、`http:` 当本地文件用。

现在不要往这些目录写正式博客：

| 路径 | 用途 | 现在能不能当博客写 |
|---|---|---|
| `content/posts/` | 正式博客 | **能，这是唯一入口** |
| `content/pages/`、`content/notes/`、`content/works/` | 未来独立板块 | 不能，路由还没接 |
| `docs/` | 项目内部文档 | 不能，不会变成 `/blog/` |
| `public/` | 全站 Logo、音效等共享资源 | 不能放文章专属图 |
| `src/` | 程序代码 | 不能放正文 |
| `out/`、`.next/` | 构建产物 | 永远不要手改 |

### 1.2 slug（文件夹名 = URL）

必须同时满足：

- 全小写英文字母、数字、连字符
- kebab-case：`why-ssg-on-edgeone`，不要 `Why_SSG`、`为什么SSG`
- 不带年份、不带中文、不带空格
- 发布后不要改。改名等于换网址；外链和分享卡片会断。若必须改，要在 `edgeone.json` 配 redirect，不要改 `next.config.ts`

公开地址一律带尾部斜杠：`/blog/<slug>/`。

章节深链是 `/blog/<slug>/#标题锚点`。锚点由标题文字生成，同名标题会变成 `-2`、`-3`。改标题可能改掉深链。

### 1.3 草稿与正式发布

`draft: true` 的文章：

- 仍必须有合法 `index.md`（frontmatter 错了，整站构建照样挂）
- **不会**出现在 `/blog/` 列表
- **不会**生成 `/blog/<slug>/` 静态页
- 素材也不会打进 `out/`

想在本地看草稿正文，把 `draft` 改成 `false`（或删掉该字段），`pnpm dev` 打开对应地址。准备上线前确认不是草稿。

### 1.4 目录怎么归类（大方向 → 章节 → 小博客）

`/blog/` 的信息架构是**两级**：板块是书，文章是章。作者口头用三个词，对应仓库里的现有字段，**不要再加一层 registry**：

| 口头说法 | 落在仓库里 | 在 `/blog/` 上的样子 |
|---|---|---|
| **大方向** | `content/sections.yml` 里登记的一条板块（`slug` / `title` / `order` / `summary` / 可选 `color`） | 书架上垂直堆叠的一本「方向书」（左窄书脊 + 右侧书页）。点开后翻页，露出该方向的文章书脊架；窄屏 / 减弱动效则落成目录树 |
| **小博客** | 文章包 `content/posts/<slug>/`（正本是 `index.md`） | 方向书里的一根文章书脊，或目录树里的一行 |
| **章节** | 该小博客在所属方向书里的次序：先按 `publishedAt` **升序**（最早的是第一章），同日再按 slug | 「第 N 篇 / 第 N 章」。**没有**单独的 `chapter` 字段，不要手写章节号 |

当前六个大方向（以 `content/sections.yml` 为准，`order` 小的在上）：

| slug（写入 `section`） | 书名 | 写什么 |
|---|---|---|
| `fullstack-learning` | 全栈小白学习记 | 从零学前端与全栈：UI、交互、Agent、架构与 Prompt |
| `ai-mflly-notes` | AI-MFlly散记 | AI 创作与工具实践：写代码、生图、写作、视频、音乐，以及这个时代 |
| `yu-reflections` | 羽の反思 | 对做过的选择、关系和自我的回头看 |
| `yu-reviews` | 羽の复盘 | 一次具体事件或项目之后的拆解 |
| `yu-essays` | 羽の随笔 | 不绑主题的短文与观察 |
| `other` | 其他 | 对不上前面五本、但仍是正式小博客的篇目 |

**「其他」不是「散页」。** 正式杂文要写 `section: other`，有文才上架。frontmatter **不写** `section` 的已发布文章，会单独成册排在书架**最后**，书名是「散页」。未知的 `section` 值（写了但没在注册表里）会让构建失败，不会偷偷进散页或「其他」。

现在留在散页、并且应当留着的只有：

- `p0-kitchen-sink` — 内容引擎黄金验收文，不是按主题写的正式方向文

新的正式文章**必须**选一个大方向（包括「其他」）。只有验收夹具才走散页。常用标签词见 [post-tags.md](./post-tags.md)（纯备忘，不参与构建）。

新增大方向：在 `content/sections.yml` 的 `sections:` 下加一条，写好 `slug`（kebab-case）、`title`（方向书书名）、`order`（整数，小的靠上）、`summary`（一册简介）、可选 `color`（`#rrggbb`）。空的大方向不会出现在书架上，有第一篇小博客归入后才会上架。书脊样式由目录页自己画，**不要**按字数手调厚度，也没有 `widthRem` 这类作者字段。

---

## 2. 整体格式怎么写

`index.md` 由两段组成：**YAML frontmatter** + **正文**。文件用 UTF-8、不要 BOM；换行用 LF。Windows 记事本另存时注意这两点。

### 2.1 frontmatter（文章头）

必须从文件第一行的 `---` 开始，第二段 `---` 结束。未知字段会直接报错，不要自创 `author`、`slug`、`category`。

```yaml
---
schemaVersion: 1
title: 文章标题
description: 列表页和微信/社交预览用的摘要，写完整的一句话
publishedAt: 2026-08-18T15:00:00+08:00
updatedAt: 2026-08-18T16:20:00+08:00
section: fullstack-learning
cover: ./media/images/cover.png
tags:
  - 架构设计
  - Prompt
draft: false
---
```

| 字段 | 必填 | 规则 |
|---|---|---|
| `schemaVersion` | 是 | 只能是数字 `1` |
| `title` | 是 | 非空。出现在列表、阅读页、浏览器标题、分享卡片 |
| `description` | 是 | 非空。列表摘要 + OG 预览文案 |
| `publishedAt` | 是 | 带时区的 ISO 8601。国内用 `+08:00`，不要写 `2026-08-18` 这种缺时间的日期 |
| `updatedAt` | 否 | 同样必须带时区。改过正文再填 |
| `section` | 否（正式文应当填） | **大方向** slug，必须已在 `content/sections.yml` 注册，否则构建报 `FRONTMATTER_SECTION_UNKNOWN`。决定这本小博客收进哪本方向书；不填则归入末尾「散页」。不要写 `chapter` / `category` / `series` |
| `cover` | 否 | 文章包内相对路径，推荐 `./media/images/cover.png`。用于列表/分享预览 |
| `tags` | 否 | 非空字符串数组。1 到多个，可自定；省略该字段表示没有标签，不要写空数组。出现在目录树章行，以及书库里悬停小书脊后的书签旁边。优先用 [post-tags.md](./post-tags.md) 里的词，没有合适的就自创，再回去补一行。备忘文档不参与校验，写错词也不会让构建失败。单标签建议不超过约 12 个汉字 |
| `draft` | 否 | 布尔值。`true` 不上架；省略或 `false` 表示正式文章 |

新增一个大方向：见 [1.4](#14-目录怎么归类大方向--章节--小博客)。不要为了「让书变厚」去改正文或发明字段。

日期合法例子：

- `2026-08-18T15:00:00+08:00`
- `2026-08-18T07:00:00Z`

不合法：`2026-08-18`、`2026/08/18 15:00`、`August 18, 2026`。

`cover` 不合法的写法：`/media/images/cover.png`、`C:\pics\cover.png`、`../other-post/cover.png`、`https://...`。

### 2.2 正文能写什么

正式文章走 `article` profile，比评论区宽松，但仍不是「任意 HTML」。

**可以直接写：**

- CommonMark：标题、段落、强调、链接、引用、列表、代码
- GFM：表格、任务列表、删除线、脚注
- 行内代码 `` `code` `` 与围栏代码块（标明语言，如 `ts`、`bash`）
- KaTeX：行内 `$E = mc^2$`，块级 `$$ ... $$`
- Mermaid：```` ```mermaid ```` 围栏
- 标准 Markdown 图片：`![替代文本](./media/images/foo.png "可选标题")`
- 站内链接：`[博客首页](/blog/)`、`[另一篇](/blog/other-slug/)`（记得尾部斜杠）
- 下一节列出的白名单自定义标签

**不要写：**

- 正文里直接贴 `<div>`、`<script>`、`<iframe>` 等 raw HTML（默认禁用）
- 自定义标签上的事件属性、内联脚本、表达式
- 把大段 JSON、整页 HTML、音视频 Base64 塞进 `index.md`
- 用 `window.print()` 或「另存为 PDF」冒充导出；读者走阅读页导出菜单

标题建议从 `#` 或 `##` 写起，和 `title` 对齐即可。第一个 `#` 可以和 frontmatter 的 `title` 相同。

### 2.3 自定义标签（媒体、问答、嵌入）

标签名小写 kebab-case；每篇里 `id` 必须唯一；作者偏好写成**单行**。没在表里的属性一律拒绝。

| 标签 | 必填属性 | 可选 | 资源必须放在 |
|---|---|---|---|
| `<video-embed>` | `id`, `src`, `title` | `poster` | `src` → `media/**.mp4`；`poster` → 图片 |
| `<audio-embed>` | `id`, `src`, `title` | — | `src` → `media/**.mp3` |
| `<svg-embed>` | `id`, `src`, `title` | — | `src` → `media/svg/*.svg` |
| `<canvas-render>` | `id`, `renderer` | `data-src`, `width`, `height` | `data-src` → `data/*.json`；`renderer` 目前只有 `function-plot` |
| `<html-embed>` | `id`, `src`, `title` | `height` | `src` **必须**是 `./embeds/<同一id>/index.html` |
| `<web-embed>` | `id`, `src`, `title` | `height` | `src` 是外链，且必须命中站点允许的 URL 策略；未允许会显示降级卡，不会偷偷 iframe |
| `<choice-question>` | `id`, `data-src` | — | `data-src` → `data/*.json` |
| `<fill-blank-question>` | `id`, `data-src` | — | 同上 |

写法示例：

```markdown
![蓝紫渐变封面](./media/images/cover.png "封面")

<video-embed id="demo-video" src="./media/video/demo.mp4" title="演示" poster="./media/images/poster.png" />

<audio-embed id="demo-audio" src="./media/audio/demo.mp3" title="一段说明" />

<canvas-render id="sine-plot" renderer="function-plot" data-src="./data/sine.json" width="720" height="360" />

<svg-embed id="pipeline" src="./media/svg/pipeline.svg" title="流水线示意" />

<html-embed id="mini-card" src="./embeds/mini-card/index.html" title="交互小页" height="260">
打不开小页时，读者会看到这段降级说明。
</html-embed>

<choice-question id="choice-basics" data-src="./data/choice-question.json" />

<fill-blank-question id="fill-basics" data-src="./data/fill-blank-question.json" />
```

`html-embed` 的 `id` 和文件夹名必须一致：`id="mini-card"` 对应 `embeds/mini-card/index.html`。公开地址是 `/embeds/<slug>/mini-card/`，不在 `/blog/<slug>/` 下面。这是安全门约束，不要改。

`web-embed` 不会把别人的网页下载进仓库，只保存链接。P0 白名单很严，不确定就不要用，或先在本地看它会不会变成降级卡。

### 2.4 问答题 JSON

放在 `data/`，用 `data-src` 引用。字段是锁定的，多写一个键会校验失败。

选择题（单选 `answer` 用字符串，多选用数组）：

```json
{
  "prompt": "正式文章的唯一权威源是什么？",
  "options": [
    { "id": "a", "label": "content/posts/<slug>/index.md" },
    { "id": "b", "label": "浏览器里的当前页面" }
  ],
  "answer": "a",
  "explanation": "仓库中的 index.md 才是正本。"
}
```

填空：

```json
{
  "prompt": "文章 URL 中的公开标识称为 ____。",
  "answers": ["slug", "文章标识"],
  "trimWhitespace": true,
  "caseSensitive": false,
  "explanation": "slug 只来自文件夹名。"
}
```

函数图（`renderer="function-plot"`）：

```json
{
  "expression": "sin(x)",
  "domain": [-6.283, 6.283],
  "range": [-1.25, 1.25],
  "samples": 240
}
```

---

## 3. 图片和其他素材放哪里

### 3.1 对照表

| 你手里的东西 | 放到 | 正文里怎么引用 |
|---|---|---|
| 封面、插图、海报 | `media/images/` | `![说明](./media/images/foo.png)` 或 frontmatter `cover` |
| 独立 SVG 图 | `media/svg/` | `<svg-embed src="./media/svg/foo.svg" ... />` |
| 视频 | `media/video/` | `<video-embed src="./media/video/foo.mp4" ... />`，只接受 `.mp4` |
| 音频 | `media/audio/` | `<audio-embed src="./media/audio/foo.mp3" ... />`，只接受 `.mp3` |
| 题目 / 图表数据 | `data/` | 标签的 `data-src="./data/foo.json"` |
| 可交互 HTML 小页 | `embeds/<id>/index.html` | `<html-embed id="<id>" src="./embeds/<id>/index.html" ...>` |
| 全站 Logo、音效 | `public/` | 不要给单篇文章用 |
| 别人网站上的页面 | 不下载 | 仅当允许时用 `<web-embed src="https://...">` |

路径一律正斜杠，且从文章包写起：`./media/images/cover.png`。不要写 `content/posts/my-slug/media/...`。

构建**只复制被引用且通过校验的文件**。文件夹里多放一张没人引用的图，不会出现在站点上，但仍会占 git。不要囤没用的大文件。

### 3.2 体积与格式（会卡住构建）

| 限制 | 数值 | 说明 |
|---|---|---|
| 任意单个文件 | ≤ 25 MB | 超过直接失败 |
| 栅格图原图（png/jpg/jpeg/webp） | ≤ **300 KB** | 这是原图兜底上限，不是「导出后再压」。先在本地压再放进仓库 |
| 全站 `out/` 文件数 | ≤ 20,000 | 每张图会派生多档 AVIF/WebP，图片多会成倍涨 |
| 动画 / 多页图 | 不接受 | GIF、动图 WebP、多页 TIFF 会报 `IMAGE_ANIMATION_UNSUPPORTED` |

允许的插图扩展名：`.png` `.jpg` `.jpeg` `.webp` `.svg`。文件名和真实类型必须一致（把 jpg 改后缀当 png 会失败）。

`index.md` **只引用原图**。480 / 960 / 1440 的 AVIF、WebP 由构建期流水线自动生成，不要自己做 `cover-960.webp` 再写进正文。

封面和正文大图建议：

- 先裁好构图，再压到 300 KB 以内
- 写清楚 `alt`，这是无图时的说明，也是可访问性文本
- 封面比例接近列表卡片更好看，但没有强制宽高

### 3.3 不要放的地方

- 不要把文章图放到 `public/images/`，删文章时会分不清谁的图。
- 不要引用仓库外的本地盘路径。
- 不要把超过 25 MB 的视频直接塞进文章包；先压，或改成外链说明。
- 不要手改 `out/` 里已经生成的图，下次构建会被覆盖。

---

## 4. 本地怎么预览、怎么改稿

工作分支用 `dev`。左侧 Git 应显示 `dev`，不要停在已经合并掉的 `feat/...` 上。

```powershell
pnpm dev
```

浏览器打开 `http://localhost:9981/blog/` 看列表，或 `http://localhost:9981/blog/<slug>/` 看正文。改 `index.md` 后刷新即可。

想验证「线上那套静态产物」：

```powershell
pnpm build
pnpm preview
```

预览静态站是 `http://localhost:9982`。`edgeone.json` 的响应头在本地预览里不生效，这是正常的。

### 4.1 让 AI 帮你改文（推荐闭环）

正本始终是 `index.md`。划词注释只是改稿备忘，存在这台电脑的 localStorage 里，**清站点数据会丢**。

1. 设置里打开 **本地作者模式**（默认关；生产站上不打开就没有可写注释）。
2. 在正文里划词，写「这里要改成……」。
3. 导出菜单选 **Markdown × 正文+注释**，下载 `<slug>.review.md`。
4. 把这个文件交给 AI。附录里的 `startOffset` / `endOffset` 是渲染后纯文本坐标，**不能按数字去切 `index.md`**；AI 应靠 `exact` + `prefix` / `suffix` + 标题路径定位。
5. 把改完的正文写回 `content/posts/<slug>/index.md`。不要把「审阅附录」粘进正本；改完应删掉附录。
6. 再 `pnpm dev` 看一遍。

导出的 `.review.md` 才是可带走的持久稿。本机注释不是私人文章，也不会同步到线上讨论库。

---

## 5. 怎么发布到线上

1. 确认 `draft` 不是 `true`。
2. `pnpm lint`、`pnpm tsc --noEmit`、`pnpm test`、`pnpm build` 能过（至少 `pnpm build` 必须过，它会跑内容校验）。
3. 在 `dev` 上提交，例如：`content(blog): add why-ssg-on-edgeone`。
4. 把 `dev` 合进 `main`（或按你当时的发布习惯推到 `main`）。
5. EdgeOne 看到 `main` 更新后会重新 `pnpm run build` 并发布 `out/`。

提交时不要带：`.env*`、密钥、`out/`、`.next/`、`.tmp/` 里的一次性文件。

发布后用公网地址打开 `/blog/<slug>/`，再抽查：封面、公式、图片、深链 `#章节`。

---

## 6. 新建一篇的最短步骤（SOP）

一次新增 = 选大方向 + 建小博客包。章节顺序不用填。

1. **选大方向**（或先登记新方向）。打开 `content/sections.yml`，从现有六个 slug 里挑一个写入 `section`。对不上前五本就用 `other`。不要把正式文留在散页。
2. **想好小博客 slug**，例如 `edgeone-ssg-notes`。这就是文件夹名，也是 `/blog/edgeone-ssg-notes/`。
3. **建文章包** `content/posts/edgeone-ssg-notes/index.md`，填好 frontmatter，**一定要有 `section`**。打 1 到多个 `tags`，优先用 [post-tags.md](./post-tags.md) 里的词。
4. 需要图就建 `media/images/`，把压到 300 KB 以内的原图放进去，正文用 `./media/images/...` 引用。
5. 需要视频 / 音频 / 题目，按第 3 节放进对应目录，再用自定义标签引用。
6. `pnpm dev`，先打开 `http://localhost:9981/blog/`：对应方向书应出现在架上（空方向本来不上架；这是该方向的第一篇时，会新出现一本）。点开那本书（或在目录树里展开那一册），章节按 `publishedAt` 从早到晚排。再打开 `/blog/edgeone-ssg-notes/` 看正文。
7. 满意后提交，合进 `main`。

最小可发布正文（无图也可以，此时不要写 `cover`；**不要省略 `section`**）：

```markdown
---
schemaVersion: 1
title: 为什么静态导出适合这篇博客
description: 用一篇短文说明 SSG、EdgeOne 与仓库正本之间的关系。
publishedAt: 2026-08-18T15:00:00+08:00
section: fullstack-learning
tags:
  - 架构设计
draft: false
---

# 为什么静态导出适合这篇博客

正文从这里开始。
```

发布后在 `/blog/` 上的位置：

- 大方向 = `fullstack-learning` 那本「全栈小白学习记」
- 小博客 = `content/posts/edgeone-ssg-notes/`
- 章节 = 按这篇的 `publishedAt` 插进「全栈小白学习记」已有文章里；比它早的在前，比它晚的在后

---

## 7. 构建最常挂在这些地方

| 现象 | 多半原因 |
|---|---|
| `ARTICLE_SLUG_INVALID` | 文件夹名不是小写 kebab-case |
| `FRONTMATTER_REQUIRED_FIELD_MISSING` | 缺 `schemaVersion` / `title` / `description` / `publishedAt` |
| `FRONTMATTER_UNKNOWN_FIELD` | 多写了 schema 没有的键 |
| `FRONTMATTER_DATE_INVALID` | 日期没带时区 |
| `FRONTMATTER_COVER_PATH_INVALID` | cover 不是文章包内相对路径 |
| `FRONTMATTER_SECTION_INVALID` | `section` 不是 kebab-case（例如写了中文或下划线） |
| `FRONTMATTER_SECTION_UNKNOWN` | `section` 没在 `content/sections.yml` 登记 |
| `ARTICLE_ASSET_NOT_FOUND` | 正文引用了还不存在的文件 |
| `ASSET_PATH_CONTRACT_INVALID` | 视频不在 `media/`、SVG 不在 `media/svg/`、题目不在 `data/`、html-embed 路径和 id 对不上 |
| `IMAGE_ORIGINAL_TOO_LARGE` | 栅格图原图超过 300 KB |
| `IMAGE_ANIMATION_UNSUPPORTED` | 用了动图 |
| 文章在本地 `pnpm dev` 看得到、列表没有 | `draft: true`，或还没刷新 / 还没重新构建 |

协议级错误会阻止构建，不会「将就上线」。改到构建变绿再推 `main`。

---

## 8. 和这份指南配套的文件

- 黄金样例：[content/posts/p0-kitchen-sink/](../../content/posts/p0-kitchen-sink/)（验收文，可对照格式，不必当自己的第一篇正式文章来改；它故意留在散页）
- 板块注册表：[content/sections.yml](../../content/sections.yml)（六个大方向的权威源）
- 标签备忘：[post-tags.md](./post-tags.md)（只记录常用词，不参与构建）
- 内容协议：[blog-content-engine.md](../specs/blog-content-engine.md) 第四节
- 目录与 `embeds/` URL：[project-structure.md](../conventions/project-structure.md)
- 网址与分享：[routing.md](../conventions/routing.md)
- 部署：[deploy-edgeone.md](./deploy-edgeone.md)
