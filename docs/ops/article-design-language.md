# 正文设计语言：自定义组件与颜色

> Created: 2026-08-30
> Status: accepted
>
> 给作者自己用的速查。协议细节以 [blog-content-engine.md](../specs/blog-content-engine.md) 第四节为准；主题 token 以 [frontend-design.md](../conventions/frontend-design.md) 为准。正文写法总入口仍是 [write-blog.md](./write-blog.md)。

这篇只回答两件事：**能写哪些标签**，以及 **颜色怎么选**。禁止 raw HTML、禁止 `style=` / `class=` / 任意 CSS。

## 0. 先选通道

| 你手里的东西 | 用什么 | 不要用什么 |
|---|---|---|
| 普通段落、标题、**有序/无序列表**、表格、引用、代码 | Markdown / GFM | 不要包一层 html-embed |
| 一句要上色或加荧光的字 | `<text-mark>` | 不要 `<span style>` |
| 结论 / 警示 / 补充 / 语录 | `<aside-note>` | 不要普通 `>` 冒充四种语气 |
| 好 vs 坏、A vs B | `<compare-block>` | 不要两张静海报 iframe |
| 履历、路径、几条有顺序的坐标 | `<timeline-block>` | 不要自己画点轴的 HTML |
| 方向卡、带色条编号卡 | `<inset-card>` | 不要封面式整页 HTML |
| 公式 | `$...$` / `$$...$$` | — |
| 流程图（≤3 张） | mermaid 围栏 | — |
| 读者能搜、能拨、能点的小页 | `<html-embed>` | 不要把不会动的卡塞进去 |
| 别人网站 | `<web-embed>`（过白名单才真 iframe） | — |
| 视频 / 音频 / SVG / 函数图 / 选择题 / 填空 | 对应媒体或问答标签 | — |

讨论区和划词注释 **不能** 用本页的设计语言标签。

---

## 1. 颜色怎么定义

颜色分三层，不要混。

### 1.1 站点角色 `tone`（跟主题走）

写在标签上：`tone="thesis"`。换宣纸黄 / 雾青 / 米白 / 夜间，色会跟着变。

| `tone` | 含义 | 宣纸黄（默认）主色 |
|---|---|---|
| `thesis` | 论点、结论 | `#a9762f` |
| `warn` | 警示 | `#a83c1f` |
| `good` | 正向对比 | `#0e6f6e` |
| `bad` | 负向对比 | `#a83c1f` |
| `note` | 旁注、补充 | `#c97a24` |
| `muted` | 弱化 | `#6b6055` |

对应 CSS 变量是 `--tone-thesis`、`--tone-thesis-wash` 等，四套主题都有值。作者不要在正文里写这些变量名。

`--highlight` 是**读者划词**用的，不是作者强调。作者强调用 `text-mark`。

### 1.2 这一篇自己的色轨 `swatch`

一篇里要反复出现「表演红 / 架构蓝」这种图例色时，在文章包装 `data/palette.json`：

```json
{
  "act": { "color": "#BE3A2B", "wash": "#F7E8E5", "night": "#E07060" },
  "art": { "color": "#A8790A", "wash": "#F6EFDC", "night": "#E0B84A" }
}
```

- `color` 必填，只接受 `#RGB` 或 `#RRGGBB`
- `wash` 可选，给浅底
- `night` 可选；没有的话夜间会自动把 `color` 提亮一点

正文里写 `swatch="act"`。文件不存在或名字没登记，构建失败。

### 1.3 一次性色值 `color`

偶尔一个色、不想进色板：`color="#2B5C82"`。可选 `color-night="#8eb4d4"`。同样只接受十六进制，不要 `red`、`rgb()`、`rgba()`。

**三选一：** `tone`、`swatch`、`color` 不能同时写两个。

---

## 2. 行内效果 `effect`

只给 `<text-mark>`。可选；不写就只换字色。

| `effect` | 观感 |
|---|---|
| （缺省） | 只改颜色 |
| `fluorescent` | 字下一条半透明色带，像荧光笔 |
| `wash` | 浅色底、小圆角 |
| `pill` | 实心小胶囊，适合一字标签 |
| `kbd` | 细边框、等宽，像键帽 |
| `dim` | 走弱化色 |

`text-mark` 不能再包一层 `text-mark`。里面可以加粗、斜体、链接、行内代码。

---

## 3. 标签清单

块级标签的 `id` 必须是小写 kebab-case，一篇里唯一。行内 `text-mark` 的 `id` 可省略。

### 3.1 `<text-mark>` — 句子里上色

```markdown
AI 是<text-mark tone="thesis" effect="fluorescent">杠杆</text-mark>。
六个维度里，<text-mark swatch="act" effect="pill">表演</text-mark>最容易被忽略。
这句只要色：<text-mark color="#2B5C82">架构分层</text-mark>。
```

### 3.2 `<aside-note>` — 结论 / 警示 / 补充 / 语录

`kind` 必填：`callout` | `warn` | `addon` | `quote`。

```markdown
<aside-note id="breadth-thesis" kind="callout" title="先说结论">
问题不是钻得不够深，是广度没有基本认知。
</aside-note>
```

可选 `swatch` / `tone` 改左边线色。孩子是普通 Markdown（可以再套 `text-mark`）。

### 3.3 `<compare-block>` + `<compare-side>` — 对照

必须恰好两个 `compare-side`。`role`：`good` | `bad` | `a` | `b`。

```markdown
<compare-block id="ui-ux">
<compare-side role="bad" title="UI 高，UX 低">
视觉很炫，但要点三四步才能开始对话。
</compare-side>
<compare-side role="good" title="UI 一般，UX 高">
界面只是看得过去，一句话就能开始。
</compare-side>
</compare-block>
```

### 3.4 `<timeline-block>` — 时间线

里面必须是一个 Markdown 列表。

```markdown
<timeline-block id="year-one">
- **投入强度** — AI 编程约一年。
- **企业合作** — 与两家企业深度合作。
</timeline-block>
```

### 3.5 `<inset-card>` — 方向卡 / 编号卡

```markdown
<inset-card id="dim-act" swatch="act" eyebrow="01" title="表演" kicker="PERFORMANCE">
**定义** — 人物每一秒发出的信息。
</inset-card>
```

### 3.6 媒体、问答、嵌入（原有）

写法与资源目录见 [write-blog.md §2.3](./write-blog.md)。提醒一句：

- `<html-embed>`：`src` 必须是 `./embeds/<同一id>/index.html`；只做**有动词**的交互（搜索、滑杆、点选工位）
- `<web-embed>`：外链，主机名必须在白名单
- `<choice-question>` / `<fill-blank-question>` / `<canvas-render>`：数据在 `data/*.json`
- 列表用 Markdown `-` / `1.`，阅读页会显示圆点和数字；任务列表 `- [ ]` 例外

---

## 4. 禁止项

- raw HTML：`<div>`、`<span>`、`<mark style>` 一律构建失败
- `style=`、`class=`、`onClick=`、属性里的 `{表达式}`
- 用 html-embed 复制印刷整页或不会动的圆角卡
- 在讨论/注释里写本页标签
- 给 frontmatter 加 `palette` 字段（色板只放 `data/palette.json`）
- 一篇 `text-mark` 超过 200 个

---

## 5. 和别的文档怎么分工

| 文档 | 看什么 |
|---|---|
| **本文** | 作者写正文时的标签与颜色速查 |
| [write-blog.md](./write-blog.md) | 建文章包、frontmatter、素材目录、预览发布 |
| [blog-content-engine.md](../specs/blog-content-engine.md) | 协议、安全、划词、导出 |
| [frontend-design.md](../conventions/frontend-design.md) | 全站 chrome token 与 `--tone-*` |
