# 目录板块审查 — 2026-08

> Created: 2026-08-30
> Status: review complete / closeout decisions adopted；审查阶段只读，收尾决策已在本发布窗口落地。
> 分支：`feat/catalog-yu-studies` @ `763349e`（跟踪 `origin/feat/catalog-yu-studies`，基线 `origin/dev`）。
> 范围：目录「大方向 / 板块」的规范符合、逻辑冗余、整体架构。不含 `feat/article-design-language` 的富文本实现（仅在合入风险里提一句）。

## 总判

没有必须立刻修才能让本目录分支构建 / 上架的运行时 P0。七个大方向都应保持拆分，没有哪一本在数据模型上不该存在。审查指出的管道护栏、架子上文案漂移、挂栏口径和测试缺口，已按最终收尾决策处理。

---

## 环境

| 项 | 值 |
|---|---|
| 日期 | 2026-08-30 |
| 审查对象 | `content/sections.yml`、已发布文 `section`、书架装配、写作指南 §1.4、相关单测 |
| HEAD | `763349e content(catalog): add 羽の参学, rename 思索, retitle 复盘` |
| 对照 | `origin/dev`；姊妹分支 `feat/article-design-language` 未合入本分支 |
| 方法 | 读注册表 / 装配代码 / 全部已发布 `section` / 测试锁定数组 / 作者文档；未改文件 |

落地内容（供核对，不是审查结论）：

1. 新方向「羽の参学」，slug `yu-studies`，order `25`，颜色 `#3a6e78`。
2. `developer-vocabulary-handbook` 改挂 `yu-studies`。
3. 「羽の反思」只改书名与简介为「羽の思索」，slug 仍为 `yu-reflections`。
4. 「羽の复盘」仍为 `yu-reviews`，简介改为定时状态记录。

## 最终收尾决策（closeout）

本报告原本记录的是只读审查快照；本节是作者在 issue #106（`[catalog] 七方向目录收尾与发布护栏`）中拍板后的最终口径：

- 七个注册方向保持不变，不合并、不新增；`yu-reflections` slug 与 `/blog/#yu-reflections` 深链保持不变。
- `other.summary` 修正为“对不上前面六本、但仍是正式小博客的篇目。”；标签备忘只保留一条完整的 `AI写作` 定义。
- 只改四篇文章的 frontmatter `section`：`when-energy-runs-low` → `yu-reviews`、`september-ninth-new-self` → `yu-reviews`、`agent-principles-and-trends` → `yu-studies`、`med-student-coding-and-health` → `yu-essays`。`july-28-ai-frontier-review` 明确保留在 `yu-reviews`。
- 新增共享目录常量和注册表确定性护栏：保留 `uncategorized` slug、重复 `order`、显式重复颜色（大小写归一化）分别报 `SECTIONS_REGISTRY_RESERVED_SLUG`、`SECTIONS_REGISTRY_DUPLICATE_ORDER`、`SECTIONS_REGISTRY_DUPLICATE_COLOR`。
- schema 层仍允许省略 `section`，但发布层只允许 `p0-kitchen-sink` 作为正式散页；其它已发布无 `section` 文章报 `PUBLISHED_POST_SECTION_REQUIRED`。草稿无 `section` 仍可读取且不上架。
- 书库方向数排除散页，散页固定色改为 `#5f625d`，注册方向「其他」继续使用 `#7d7468`。

最终发布归属数量锁定为：全栈学习 3、AI 散记 3、参学 2、思索 2、复盘 4、随笔 12、其他 4、散页 1，共 31 卷在架；目录抬头为 `7 个方向 · 31 卷在架`。

| 审查项 | 级别 | 已解决/由测试锁定 |
|---|---|---|---|
| 保留 slug `uncategorized` 未锁死 | P2 | 已解决：共享常量 + `SECTIONS_REGISTRY_RESERVED_SLUG` 测试 |
| 「其他」与「散页」同色 | P2 | 已解决：散页固定色 `#5f625d`，书架单测锁定两色不同 |
| 正式文缺少 `section` 会静默落入散页 | P2 | 已解决：发布层白名单校验 + `PUBLISHED_POST_SECTION_REQUIRED` 测试 |
| 书库计数把散页算成方向 | P2 | 已解决：从 `ShelfBook[]` slug 语义排除散页；浏览器测试锁定精确抬头 |
| 注册表未校验 `order` / 显式 `color` 唯一 | P2 | 已解决：大小写归一化颜色与重复 order 诊断测试 |
| 四篇文章挂栏口径与最终决策不一致 | P2 | 已解决：四篇改挂 + `july-28-ai-frontier-review` 保留归属测试 |

---

## (a) 规范符合

对照：`AGENTS.md`、D23、`docs/ops/write-blog.md` §1.4、frontmatter 契约、测试锁定。

**符合：**

- 仍是两级目录：书 = `content/sections.yml`，章 = `content/posts/<slug>/index.md` 的 `section`。没有新 frontmatter 键，没有 `chapter` / `series`。
- 未知 `section` 仍走 `FRONTMATTER_SECTION_UNKNOWN` 构建失败（`src/server/content/read-sections.ts` 的 `assertKnownSections`）。schema 允许省略 `section`，但发布层只让黄金验收文进入合成册「散页」，不进「其他」。
- 空的已注册方向不上架（`create-shelf-books.ts`）。书脊厚度仍由目录页自己画，没有作者字段 `widthRem`。
- `yu-reflections` 只改了 `title` / `summary`，slug 与深链 `#yu-reflections` 未动。
- 书架仍由 `src/app/blog/page.tsx` → `createShelfBooks` → `BlogIndex` 的书库 / 目录树共用同一份 `ShelfBook[]`。未引入第二套 registry，未把 3D 泄到阅读页，未改 `next.config.ts` / `edgeone.json` / lockfile。
- 测试与注册表锁死一致：`tests/unit/sections-registry.test.ts` 的 slug/title 数组、`tests/unit/catalog-classification.test.ts` 的 `LIVE_SECTION_SLUGS` 均为七本；散页白名单仍只有 `p0-kitchen-sink`；导入文必须落在已注册方向，词汇手册断言为 `yu-studies`。

**审查时发现、已由本次收尾解决并由测试锁定（P1–P2）：**

| 项 | 证据 | 级别 | 已解决/由测试锁定 |
|---|---|---|---|
| 「其他」简介仍写「前面五本」 | `content/sections.yml` `other.summary`；该书简介会画在书库 / 目录树上。`write-blog.md` §1.4 已是「前六本 / 七个大方向」 | P1 | 已解决：注册表文案改为“前面六本”，live registry 测试锁定完整 summary |
| 标签表「AI写作」在散记下重复两行 | `docs/ops/post-tags.md` | P2 | 已解决：保留覆盖起稿、修改、文风和生成文字边界的完整定义 |
| 正式文「必须选大方向」只写在作者指南，schema 仍允许省略 `section` | `write-blog.md` vs `validate-frontmatter.ts`（`section` 可选） | P2（见 c-4） | 已解决：发布层校验与 `PUBLISHED_POST_SECTION_REQUIRED` 测试锁定；schema 可选能力保留 |

标签不是第三层分类，这一点文档写对了；Prompt / Agent / 架构设计在学习记与参学里复用，不构成规范违反。

---

## (b) 逻辑是否顺、有没有该合并的栏

**不建议合并任何一本。** 七本不是同一条主题轴切出来的，而是作者明确要求的「领域 / 实践 / 来源 / 写法 / 收容」混用。读者认书脊书名；作者按「这篇是怎么写出来的」选栏。薄书（参学 1 篇、复盘 2 篇）不是合并理由——空书本来就不会上架。

| slug | 书名 | 已发布篇数 | 边界 | 该不该独立 |
|---|---|---:|---|---|
| `fullstack-learning` | 全栈小白学习记 | 3 | 从零学前端 / 全栈 | 是 |
| `ai-mflly-notes` | AI-MFlly散记 | 3 | AI 工具与创作实践 | 是 |
| `yu-studies` | 羽の参学 | 2 | 从对话里沉淀的词表 / 方法 / 问法 | 是；不能并进散记 |
| `yu-reflections` | 羽の思索 | 2 | 围着一个念头自己想 | 是 |
| `yu-reviews` | 羽の复盘 | 4 | 按日 / 月记状态，不围绕论点 | 是；与思索拆开是作者硬要求 |
| `yu-essays` | 羽の随笔 | 12 | 不绑主题的短文 | 是 |
| `other` | 其他 | 4 | 对不上前六本的**正式**小博客（课报等） | 是 |
| `uncategorized`（非注册表） | 散页 | 1 | 没填 `section` 的系统桶 | 必须留在注册表外 |

三层残余必须分清：随笔 = 个人散写；其他 = 正式但无处可放；散页 = 没选栏。`from-using-ai-to-understanding-ai` 放在 `other` 合理（课报），不要因为正文写了全栈就塞进学习记。

参学 / 散记的分界已经写在 `write-blog.md` §1.4：跟 AI 聊完整理出的词表、方法进参学；绑具体工具的创作实践进散记。代码无法自动执行这条，只能靠作者选栏。

**最终挂栏口径（改 `section` 即可，不改注册表）：**

| slug | 审查时归属 | 最终归属 | 理由 |
|---|---|---|---|
| `july-28-ai-frontier-review` | `yu-reviews` | `yu-reviews`（保留） | 以日期和“第一天正式复盘”为组织框架，保留复盘归属 |
| `when-energy-runs-low` | `yu-reflections` | `yu-reviews` | 某日语音转写的状态记录 |
| `agent-principles-and-trends` | `ai-mflly-notes` | `yu-studies` | 从交谈抽出的方法，不绑某一个创作工具 |
| `med-student-coding-and-health` | `yu-reflections` | `yu-essays` | 自我介绍 + 劝人注意身体 |
| `september-ninth-new-self` | `yu-reflections` | `yu-reviews` | 按日期记录阶段状态，和复盘的定时观测口径一致 |

以上四篇已按最终决策改挂；`july-28-ai-frontier-review` 的 `yu-reviews` 归属明确保留。四篇正文、slug、标题和发布日期均未改。

---

## (c) 整体架构

**没有哪一本方向书在架构上不该存在。** 数据流仍是一条：

`content/sections.yml` → `frontmatter.section` → `listSections` + `assertKnownSections` → `createShelfBooks` → 书库（`shelf-stack.tsx`）与目录树（`tree-index.tsx`）共用 `ShelfBook[]`

阅读页不带板块 chrome，符合 D23。

### 管道上的洞

**c-1. 保留 slug 未锁死（审查时潜伏，已解决）— P2**

审查时散页内部 slug 硬编码 `uncategorized`（`src/features/blog-index/create-shelf-books.ts`），不在注册表里；当时 `listSections` 只查重 slug，不禁止登记 `uncategorized`。

收尾后 `listSections` 以 `SECTIONS_REGISTRY_RESERVED_SLUG` 拒绝登记；共享常量由内容层与书架层共同引用，避免两处语义漂移。

**c-2. 「其他」与「散页」同色（审查时问题，已解决）— P2**

`other.color` 保留 `#7d7468`；`UNCATEGORIZED_BOOK_COLOR` 已改为 `#5f625d`，并由书架单测锁定两色不同。

**c-3. 架子权威简介过期（审查时问题，已解决）— P1**

`other.summary` 已改为「对不上前面六本、但仍是正式小博客的篇目。」；注册表是架子文案唯一权威源，live registry 测试锁定该值。

**c-4. `section` 对正式文是软约束（审查时问题，已解决）— P2**

schema 仍允许省略，以保留草稿和黄金验收夹具能力；`listPublishedPosts` 在发布前强制非白名单正式文章填写 `section`，并以 `PUBLISHED_POST_SECTION_REQUIRED` 失败。草稿无 `section` 仍可读取但不会上架。

**c-5. 计数把散页算成「方向」（审查时问题，已解决）— P2**

`blog-index-view.tsx` 现在从 `ShelfBook[]` 排除 `uncategorized` 后计算方向数，目录浏览器测试锁定 `7 个方向 · 31 卷在架`。

**c-6. 注册表护栏偏窄（审查时问题，已解决）— P2**

现在校验显式 `order` 与显式 `color` 唯一（颜色按小写归一化），并拒绝保留 `uncategorized`；重复项均有确定性诊断码和单测。

**c-7 / c-8.** 阅读页未错误依赖板块 chrome。标签未被写成第三层分类。

**c-9. 远期边界，不是现伤**

`content/notes/` 预留未来 `/notes/` 短随笔，与 `/blog/` 上的「羽の随笔」不是同一层。现在没接路由。以后做 `/notes/` 时再划一次，不必现在改板块。

---

## 已发布归属快照（收尾后）

| 板块 | slug 列表 |
|---|---|
| fullstack-learning | `ai-coding-core-practice`, `ai-coding-engineering-mindset`, `when-we-talk-about-ai-coding` |
| ai-mflly-notes | `ai-deep-learning-plan`, `open-models-and-watermarks`, `from-ten-to-hundred-ai-video` |
| yu-studies | `developer-vocabulary-handbook`, `agent-principles-and-trends` |
| yu-reflections | `on-love-a-first-pass`, `personal-finance-and-ai-dev` |
| yu-reviews | `october-busy-and-growth`, `july-28-ai-frontier-review`, `when-energy-runs-low`, `september-ninth-new-self` |
| yu-essays | `absorption-as-digestion`, `cultivation-rules-of-feixing`, `after-watching-malice`, `graduation-and-one-inch-time`, `return-to-the-essence`, `military-training-notes`, `let-ai-invade-science-fiction`, `stories-with-the-woods`, `self-intro-in-transition`, `editing-quantity-to-quality`, `visiting-the-ancestors`, `med-student-coding-and-health` |
| other | `career-planning-course-report`, `from-using-ai-to-understanding-ai`, `education-in-the-ai-era`, `hui-lao-zhi-zhi-practice` |
| 散页 | `p0-kitchen-sink` |

---

## 合入风险

本分支与 `feat/article-design-language` 从 `origin/dev` 各自切出，互不包含。已知可能冲突文件：`docs/ops/README.md`、`docs/ops/write-blog.md`（两边都改了目录说明、§1.4 / 相关索引）。最终合入顺序锁定为：目录 PR 先进入 `dev`，设计语言分支随后普通 merge 最新 `origin/dev`，只解决两处分支交叉文档，最后统一创建 `dev → main` 发布 PR。本报告记录审查与决策，不替代 GitHub PR 的 CI 和审查门禁。

---

## 不要做的事

- 不要把参学并回散记，也不要和思索并成一本「羽の个人」。
- 不要为了让书变厚去改正文，或发明 `chapter` / `series`。
- 不要把「其他」改成散页，也不要把 `p0-kitchen-sink` 填进某个大方向。
- 不要把历史审查段落中的“建议”误读为新增范围；最终收尾范围以本报告“最终收尾决策”和 issue #106 为准。

## 收尾结果

原审查中的优先级建议已全部落地并由测试锁定：

1. ~~改 `other.summary` 为「前六本」~~ — 已完成，live registry 测试锁定。
2. ~~注册表禁止 slug `uncategorized`~~ — 已完成，`SECTIONS_REGISTRY_RESERVED_SLUG` 锁定。
3. ~~给散页换一个不等于「其他」的颜色~~ — 已完成，固定为 `#5f625d`。
4. ~~草稿改正式发布时强制 `section`~~ — 已完成，白名单与 `PUBLISHED_POST_SECTION_REQUIRED` 锁定。
5. ~~书库计数把散页从「方向」里剔除~~ — 已完成，浏览器精确抬头测试锁定。
6. ~~按作者拍板改挂 (b) 里那几篇~~ — 已完成，四篇改挂且保留 July 复盘归属。
7. ~~`post-tags.md` 去掉重复的「AI写作」~~ — 已完成。

验证命令与结果已回填于下方；目录分支通过后，issue #106 由目录 PR 关闭，设计语言集成由 issue #107 的独立 PR 关闭。

## 收尾验证记录

目录分支收尾实现的验证结果：

| 命令 | 结果 |
|---|---|
| `pnpm vitest run tests/unit/sections-registry.test.ts tests/unit/content-discovery.test.ts tests/unit/catalog-classification.test.ts tests/unit/shelf-books.test.ts` | exit 0；4 个文件、41 个测试通过 |
| `pnpm lint` | exit 0 |
| `pnpm tsc --noEmit` | exit 0 |
| `pnpm test` | exit 0；44 个文件、359 个测试通过，3 个 Windows 能力相关用例跳过 |
| `pnpm build` | exit 0；Next 静态导出与 postbuild 3 个校验通过 |
| `pnpm test:browser -- tests/browser/imported-posts.spec.ts tests/browser/content-routes.spec.ts --workers=1` | exit 0；Chromium 7 个测试通过（包含精确抬头、旧 hash、窄屏目录树和文章链路） |
| `out` 文件数 / 单文件大小检查 | 468 个文件；0 个文件超过 25 MB |

构建和浏览器测试只产生本地构建缓存与截图，不纳入目录 commit；`.trae/` 始终未 staging。
