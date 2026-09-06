# 阅读页排版与章节语义复查

本轮在 `feat/blog-rich-content` 分支继续优化，没有合并分支。目标是修复标题后正文的首行间距、章节摘要孤立成句，以及行内富文本标签导致的伪标题。

## 具体修复

- 阅读页中 `h1/h2/h3/h4` 后的直接正文段落使用 `text-indent: 2em`，即两个汉字宽度；列表、图片、视频、HTML/Canvas 嵌入和组件卡片不强行缩进。
- `ai-coding-core-practice` 第 5 章的四句摘要改成一个导语旁注和三项真实列表，保留原句及顺序。
- 第 7 章部署卡片的“域名与 IP 如何绑定”“SSL 证书：为什么网站需要它”等内容使用普通 Markdown 强调，不再让行内 `text-mark` 的后续文字被 Markdown 误拆成伪标题。
- 文档引擎 `registered-tag-parse` 不把 inline registered tags 当成 paired block tags 扫描；这样列表、引用和表格中的 `<text-mark>` 会保持在当前句子里。
- 新增设计语言单测，覆盖行内强调在列表、引用、表格中的边界；新增阅读页浏览器单测，逐页检查标题后首段、无横向溢出以及第 5 章／第 7 章的真实节点结构。

## 逐页验收范围

按用户要求逐个打开 18 篇目标文章（排除羽の随笔、羽の参学）：

`september-ninth-new-self`、`october-busy-and-growth`、`career-planning-course-report`、`education-in-the-ai-era`、`when-energy-runs-low`、`open-models-and-watermarks`、`med-student-coding-and-health`、`on-love-a-first-pass`、`ai-deep-learning-plan`、`personal-finance-and-ai-dev`、`agent-principles-and-trends`、`july-28-ai-frontier-review`、`ai-coding-engineering-mindset`、`ai-coding-core-practice`、`from-ten-to-hundred-ai-video`、`hui-lao-zhi-zhi-practice`、`when-we-talk-about-ai-coding`、`from-using-ai-to-understanding-ai`。

每篇分别在 1440px 和 390px 检查：

- 页面成功加载并完成阅读页 hydration；
- 章节标题与目录锚点可见；
- 真实 `ul/ol` 节点存在，十月复盘 9 项、九月教训 5 项保持原数量；
- 标题后的正文首段首行缩进至少为正文字号的 1.8 倍；
- 页面和嵌入没有横向溢出；
- 原有 HTML embed 完成握手；
- 图片加载、夜间主题和 reduced-motion 不报错；
- 核心能力页不存在“如何绑定”“：为什么网站需要它”这类由行内标签错误产生的伪标题；
- 第 5 章导语旁注 1 个、其摘要列表 3 项、部署卡片列表 4 项均真实存在。

截至本轮：18 × 2 = 36 组逐页浏览器检查通过；全量单测 428 通过、0 失败、3 项原有 Windows 条件跳过；Lint、TypeScript、静态构建和 postbuild 均通过。

本轮没有修改随笔、参学正文，没有生成图片，没有修改分类、slug 或发布配置。分支最新提交推送前仍需在本轮提交后重新核对远端 SHA。
