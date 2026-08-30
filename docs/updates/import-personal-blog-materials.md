# 个人博客素材导入 — 上传清单与任务交接

> 来源目录（只读，不进 git）：`C:\Users\AIMFl\Downloads\个人博客素材`
> 原始导入分支：`feat/import-personal-blog-materials`；本次保真收尾分支：`feat/content-fidelity-title-closeout`（从最新 `dev` 切出）
> 阅读页日期：`/blog/<slug>/` 中栏顶栏显示 Asia/Shanghai 人类可读日期（非 ISO）。

## 映射表

| 源文件 | slug | 大方向 | publishedAt | 标签 | 媒体 | 备注 |
|---|---|---|---|---|---|---|
| `26-7-13从十到一百·AI视频影视语言注入指南.html` | `from-ten-to-hundred-ai-video` | ai-mflly-notes | 2026-07-13T00:00:00+08:00 | AI视频 | html-embed + svg | 印刷页拆成正文 + 组件 |
| `26-7-19开发词汇手册 (1).html` | `developer-vocabulary-handbook` | yu-studies | 2026-07-19T00:00:00+08:00 | 架构设计, Prompt, Agent | html-embed + 表 | 后改挂「羽の参学」 |
| `AI编程方向概览/AI技术组发展方向与工程化思维分享（上册）.html` | `ai-coding-engineering-mindset` | fullstack-learning | 2026-07-29T00:00:00+08:00 | Agent, 架构设计 | html-embed | 7-28 口述次日分享的整理 |
| `AI编程方向概览/AI编程核心能力体系与工程实践指南（下册）.html` | `ai-coding-core-practice` | fullstack-learning | 2026-07-30T00:00:00+08:00 | Agent, 架构设计 | html-embed | 同上 |
| `AI编程方向概览/style.css` | — | — | — | — | — | 样式内联进 embed，不单独成文 |
| `AI编程范式笔记·羽升手记01-v0.3.pdf` | `when-we-talk-about-ai-coding` | fullstack-learning | 2026-07-13T00:00:00+08:00 | 架构设计, Agent, Prompt | mermaid + 表 | PDF 不进仓库 |
| `2026年思政课社会实践报告_慧老智治医心为民_宗思阳团队.docx` | `hui-lao-zhi-zhi-practice` | other | 2026-08-30T00:00:00+08:00 | 报告, 医学, 教育, AI | mermaid | 去掉电话与学号 |
| `自我认知与职业生涯规划课报告.txt` | `career-planning-course-report` | other | 2026-05-29T00:00:00+08:00 | 报告, 人生, AI | mermaid | 大一下 |
| `AI时代教育变革与课程体系建设思考_2026年08月30日00时53分31秒.txt` | `education-in-the-ai-era` | other | 2026-08-30T00:53:31+08:00 | 教育, AI, 报告 | mermaid | 轻度保真整理 |
| `AI智能体技术原理与行业趋势分享_2026年08月30日00时59分45秒.txt` | `agent-principles-and-trends` | fullstack-learning | 2026-08-30T00:59:45+08:00 | Agent, AI | mermaid + html-embed | 轻度保真整理；改挂「全栈小白学习记」 |
| `Ai深度学习计划.txt` | `ai-deep-learning-plan` | yu-reviews | 2025-12-09T00:00:00+08:00 | AI时代, AI | mermaid | 轻度保真整理；改挂「羽の复盘」 |
| `博客素材816。.txt` | `open-models-and-watermarks` | ai-mflly-notes | 2026-08-15T00:00:00+08:00 | AI时代 | mermaid | #0815 |
| `10月份总结.txt` | `october-busy-and-growth` | yu-reviews | 2025-11-02T00:00:00+08:00 | 日常, 社团, 人生 | html-embed | 写于25-11-2 |
| `7-28日总结反思_2026年08月30日01时00分30秒.txt` | `july-28-ai-frontier-review` | yu-reviews | 2026-07-28T00:00:00+08:00 | AI, 全栈开发, 人生 | mermaid | 轻度保真整理；保留复盘归属，导出时钟不覆盖专项日 |
| `20250804突然的小反思.txt` | `when-energy-runs-low` | yu-reviews | 2025-08-04T00:00:00+08:00 | 日常, 人生 | — | 轻度保真整理；保留原始能量、月计划、小说与相机表达 |
| `个人财务基础分析与反思.txt` | `personal-finance-and-ai-dev` | yu-reviews | 2026-08-26T00:00:00+08:00 | 生活, AI | mermaid | 轻度保真整理；改挂「羽の复盘」，日期按本次个人财务复盘归档 |
| `医学生转码血泪史 ┃ 注意身体.txt` | `med-student-coding-and-health` | yu-reviews | 2026-02-19T00:00:00+08:00 | 医学, 生活 | — | 轻度保真整理；改挂「羽の复盘」 |
| `浅涉谈爱情.txt` | `on-love-a-first-pass` | yu-reflections | 2025-10-20T00:00:00+08:00 | 人生 | — | |
| `备忘录文档_202608300114.docx` | `september-ninth-new-self` | yu-reviews | 2025-09-09T00:00:00+08:00 | 人生 | mermaid | 非录音稿重复；后改挂「羽の复盘」 |
| `修为规则.txt` | `cultivation-rules-of-feixing` | yu-essays | 2025-07-07T00:00:00+08:00 | 科幻 | mermaid | 设定草稿 |
| `兴许对于一位刚刚接触剪辑的人而言.txt` | `editing-quantity-to-quality` | yu-essays | 2026-02-06T00:00:00+08:00 | 人生 | mermaid | |
| `军训有感（极速版）.txt` | `military-training-notes` | yu-essays | 2025-09-04T00:00:00+08:00 | 日常, 人生 | — | |
| `感悟 - 回归本真.txt` | `return-to-the-essence` | yu-essays | 2025-12-26T00:00:00+08:00 | 人生 | — | |
| `备忘录文档_202608300109.docx` | `absorption-as-digestion` | yu-essays | 2025-12-26T12:00:00+08:00 | 人生 | mermaid | 同日另一篇，正午以区分章节序 |
| `毕业升学  一寸光阴的曾经.txt` | `graduation-and-one-inch-time` | yu-essays | 2025-07-15T00:00:00+08:00 | 人生 | mermaid | |
| `源远流长（随笔）.txt` | `visiting-the-ancestors` | yu-essays | 2025-08-23T00:00:00+08:00 | 家庭, 人生 | — | |
| `自我介绍~过渡.txt` | `self-intro-in-transition` | yu-essays | 2025-11-12T00:00:00+08:00 | 人生 | html-embed | |
| `说一说和树林的故事(1).txt` | `stories-with-the-woods` | yu-essays | 2026-03-10T00:00:00+08:00 | 人生, 社群 | — | 轻度保真整理 |
| `那么就让AI顺便也入侵一下科幻吧.txt` | `let-ai-invade-science-fiction` | yu-essays | 2025-10-31T00:00:00+08:00 | AI写作 | mermaid | |
| `备忘录文档_202608300123.docx` | `after-watching-malice` | yu-essays | 2025-07-08T00:00:00+08:00 | 人生 | — | 《恶意》观后感 |

## 跳过 / 合并

- `AI编程方向概览/style.css`：不是文章，样式内联进 html-embed。
- 三份 `备忘录文档_*.docx` **不是** 08-30 录音 txt 的重复，已各自成文。

## 上传素材部署清单

本批 **没有** 需要上传到 husteread COS 的封面/视频。文章包里只有 Markdown、html-embed（`embeds/*/index.html`）和正文里的 Mermaid/表格。构建产物不超 25 MB 单文件。

| 项 | 状态 |
|---|---|
| 远程图片 / 视频 | 无（未生图、未生视频） |
| 本地 git 文章包 | 29 篇 `content/posts/<slug>/` |
| PDF / DOCX 原件 | 不进仓库 |
| Downloads 原目录 | 只读，不复制进 git |
| `pnpm lint` / `tsc` / `test` / `build` | 已通过 |
| Playwright | catalog + 阅读页日期 + 两篇导入文，连续两轮通过 |
| 合入 `dev` / `main` | 见文末 SHA |

## 任务交接

- 功能分支：`feat/import-personal-blog-materials`（父提交 `dev` @ `8a473f2`）
- 阅读页日期：`formatReaderPublishedAt`，厨房水槽验收为 `2026年8月16日 10:00`
- 散页仍只有 `p0-kitchen-sink`
- 三份备忘录 docx **不是** 08-30 录音稿重复，已分别成文
- 思政报告已去掉电话与学号
- 已知观感：影视语言指南页面在 `next dev` 下 HTML 较大（html-embed + mermaid），首次编译约 20–30 秒；生产 SSG 已通过
- 未关 #50

## 本次内容保真与标题归档收尾（2026-08-30）

本次收尾以 `C:\Users\AIMFl\Downloads\个人博客素材` 为只读来源，逐篇复核全部 29 篇导入文章。素材目录不复制进仓库，PDF / DOCX 原件不进 Git；思政报告继续保留上一轮的电话、学号隐私删改。TXT 与 DOCX 只做轻度保真整理：去除说话人标签、时间戳、明显 ASR 噪音和末尾 `以上内容由AI生成，仅供参考`，在不改措辞和含义的前提下重新分段；不作概括、扩写、第三人称改写或价值判断替换。HTML 继续通过安全的 `html-embed` 文章资源呈现，PDF 继续转为 Markdown，均不把整页 raw HTML 或原文件放入正文。

### 标题、板块与日期归档

以下 11 篇只修改 frontmatter `title`、正文首个 `#` 和表中列出的 `section` / `publishedAt`；slug、URL、tags、description 和文章资源保持不变。第一篇的旧标题作为紧随主标题的 Markdown 引用块，不新增 `subtitle` 字段。

| slug | 最终标题 | section | publishedAt 处理 |
|---|---|---|---|
| `when-we-talk-about-ai-coding` | `AI编程范式笔记·羽升手记01-v0.3`（引用块保留“当我们在聊 AI 编程的时候，我们到底在聊什么”） | `fullstack-learning` | 保持 2026-07-13 |
| `ai-deep-learning-plan` | `25-12-9 AI 深度学习计划` | `yu-reviews` | 保持 2025-12-09 |
| `open-models-and-watermarks` | `26-8-15 复盘 · 开源模型廉价智能和水印` | `ai-mflly-notes` | 保持 2026-08-15 |
| `agent-principles-and-trends` | `Agent的简单理解` | `fullstack-learning` | 保持原值 |
| `personal-finance-and-ai-dev` | `26-8-26 个人财务复盘` | `yu-reviews` | 改为 2026-08-26 |
| `when-energy-runs-low` | `25-8-4 复盘 · 能量低的那天` | `yu-reviews` | 保持 2025-08-04 |
| `september-ninth-new-self` | `25-9-9 复盘 · 九月九日新的自己` | `yu-reviews` | 保持 2025-09-09 |
| `october-busy-and-growth` | `25年10月复盘 · 认知、忙碌、成长` | `yu-reviews` | 仍为 2025-11-02 |
| `july-28-ai-frontier-review` | `26-7-28 复盘 · AI方向如是状态` | `yu-reviews` | 保持 2026-07-28 |
| `editing-quantity-to-quality` | `剪辑&质变与量变的简单理解` | `yu-essays` | 保持 2026-02-06 |
| `med-student-coding-and-health` | `26-2-19 复盘 · 医学生转码血泪史｜注意身体` | `yu-reviews` | 保持 2026-02-19 |

收尾后的已发布目录数量锁定为：全栈小白学习记 4、AI-MFlly散记 2、羽の参学 1、羽の思索 1、羽の复盘 7、羽の随笔 11、其他 4、散页 1，共 31 卷在架；目录抬头仍为 `7 个方向 · 31 卷在架`。`july-28-ai-frontier-review` 明确保留在 `yu-reviews`，`yu-reflections` slug 与 `/blog/#yu-reflections` 深链不变。
