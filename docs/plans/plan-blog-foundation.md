# 博客工程实践图谱（P0–P2）

> Created: 2026-08-15
> Updated: 2026-08-16
> Status: accepted roadmap（进入每阶段/每模块前仍须满足对应技术门）
>
> 本计划是博客内容系统的**工程实践图谱**：按「博客可对外使用」这一产品目标划分 P0/P1/P2，把 P0 拆成可独立推进的模块，并规定模块 → GitHub Issue → Loop 推进的工作方式。
> 本计划描述范围、依赖与验收，不替代 [博客内容引擎功能规格](../specs/blog-content-engine.md)；契约冲突时以规格为准。

## 一、优先级定义

| 级别 | 目标 | 一句话判据 |
|---|---|---|
| **P0** | **博客可对外使用** | 访客能访问上线站点，读到全量正确渲染的文章（含全部自定义组件），能划词看到注释机制在工作，能导出 Markdown/TXT |
| **P1** | 公开互动与完整导出 | 访客能登录、发评论/注释并真实持久化；能直接下载 DOCX/PDF |
| **P2** | 作者生产力与治理 | 在线编辑、AI 询问、按真实需求引入的治理能力（原 P3，范围不变） |

不在 P0–P2 内的一切（`/notes/` `/works/` `/about/`、分享卡片图、论坛化能力、新灵感）统一进 GitHub 的「Idea Vault」存储 issue，不进本计划。

## 二、计划原则

1. 先锁内容协议和 IR，再做页面外观；先证明一条真实纵向链路，再批量增加 renderer。
2. 注释机制是 P0 能力，但**真实公开写入依赖登录（架构 D1）**：P0 用开发仓储/AuthPort 假身份完成全链路验证，P1 接入真实身份后对外开放写入。P0 的 UI 必须如实显示功能状态，不伪装已上线。
3. 评论（含右栏页签与整幅页尾）在 P0 只落布局外壳与明确的「即将开放」状态，数据与交互随 P1 上线。
4. 真实 Supabase/Auth/RLS 必须在公开写入前完成，不能用前端按钮隐藏代替权限。
5. PDF/DOCX 在锁依赖前先做中文长文档技术验证（P1 进入门）。
6. **字体走云字体服务**：字体文件不进仓库、不进 `out/`（空间与 20,000 文件数限制均不允许自托管大字体）。选用国内可达的云字体 CDN（不依赖 Google Fonts），`unicode-range` 切片由服务商分发承担；导出所需完整字体也在触发导出时从 CDN 拉取。服务商选定属 P0 模块内决策，须验证国内延迟与许可证。
7. 每个模块经 GitHub Issue 驱动开发，提交可运行、可测试、可回退的 Git checkpoint。
8. 阶段/模块的「进入门」先于编码；未通过门时只能做研究性验证。
9. 不提前实现论坛、投稿、审核状态机、测验后台或私密内容。

## 三、阶段依赖图

```text
P0 博客对外可用（内容内核 + 全量渲染 + 阅读页 1:1 + 注释机制 + MD/TXT 导出 + 上线）
  ↓
P1 公开互动（登录、评论、真实持久化）+ DOCX/PDF 直接下载
  ↓
P2 在线编辑、AI 询问与后期治理增强
```

## 四、P0：博客对外可用

### 目标

一个访客可以访问部署在 EdgeOne 的正式站点：`/blog/` 列出文章、`/blog/<slug>/` 以 1:1 原型形态展示三栏阅读页，正文中 Markdown/GFM、代码、KaTeX、Mermaid、图片与**全部 8 个自定义标签组件**正确渲染，划词注释机制全链路可验证（开发仓储），可直接下载 Markdown 纯正文与 TXT。

### P0 模块划分（对应 GitHub parent issues）

```text
M1 工程底座与内容管线 ──→ M2 doc-engine 内核 ──→ M3 内置语法 renderer ──┐
                                    │                                    ├──→ M8 上线与整体验收
                                    ├──→ M4 自定义标签 renderer ─────────┤
                                    ├──→ M6 划词与注释机制 ──────────────┤
                                    └──→ M7 MD/TXT 导出 ────────────────┘
M5 阅读页与全站外壳（可与 M2–M4 并行开工，接入时依赖 M2/M3）──────────────┘
```

#### M1 工程底座与内容管线

- 测试栈（Vitest 单元/契约 + Playwright 浏览器）与解析依赖（unified/remark/rehype、KaTeX、Mermaid 等）安装——**依赖安装须先取得授权，这是 P0 进入门**。
- `content/posts/<slug>/` 文章包 + frontmatter v1 校验 + 覆盖全部能力的中文综合验收文章。
- 文章发现、读取、`generateStaticParams`、metadata（`src/server/content`，`server-only`）。
- 资产 manifest 与受控复制；路径穿越、重复 ID、缺资源、超大文件诊断；EdgeOne 25 MB/20,000 文件校验。
- 构建期图片流水线（响应式尺寸与现代格式；派生变体计入文件数上限）。
- 处理与静态 export 冲突的 `src/app/api/ping/route.ts`（修改/删除按边界单独确认）。

#### M2 doc-engine 内核

- Canonical Document IR、SourceRange、稳定块 ID、canonicalText/source map、diagnostics。
- Markdown/GFM 编译链路；raw HTML 默认禁用。
- RendererDefinition、静态 registry、`article`/`discussion`/`editor-preview` profile 与 export projection policy 骨架。
- 统一 `DocumentRenderer` 屏幕入口、未知标签/非法节点 fallback、组件级错误边界。
- 目录 outline 提取（供 M5 双模式目录消费）。

#### M3 内置语法 renderer

- 代码块（高亮、语言标签、复制按钮）。
- KaTeX（构建期渲染为 HTML，文章页不带公式运行时）。
- Mermaid（浏览器视口内懒加载，严格安全配置）。
- 图片 renderer（衔接 M1 图片流水线；宽高占位防抖动）。
- 每项完成 schema、屏幕、fallback、MD/TXT 投影与 fixture 测试。

#### M4 自定义标签 renderer（首批 8 个全量）

- `<video-embed>` / `<audio-embed>`。
- `<canvas-render>` 注册键机制 + 至少一个函数图像示例。
- `<svg-embed>` 构建期清洗与安全投影。
- `<html-embed>` / `<web-embed>`：**进入门 = iframe 隔离源、sandbox/CSP/Permissions Policy/`referrerPolicy` 与 `X-Frame-Options: DENY` 协调方案通过安全审查**；未通过前只能展示 fallback 卡片。
- `<choice-question>` / `<fill-blank-question>` 纯前端自测。
- 每个 renderer 完成 schema、屏幕、fallback、MD/TXT 投影/占位与测试；DOCX/PDF 仅接口与显式「不支持」诊断。

#### M5 阅读页与全站外壳（1:1 对标原型）

- 三栏布局、双层滚动、分栏拖动、整幅页尾（评论区外壳 + 未开放状态）、≤1024px 抽屉。
- 进页书册遮罩（Uiverse 原作 + Pretext Two 印章）；右栏骨架懒载与 `--dur-reveal` 缓出；右侧悬浮小笔。
- 绳挂导航阅读页挂件（导出/分享/GitHub/主题/音效/设置）、渐隐规则与命中区；下落便签通知；隐去式滚动条；弹窗。
- 左栏目录双模式（常规树 + 图形骨架缩略，含微标与视口框）。
- `/blog/` 列表页书架形态；标题锚点与深链。
- **云字体接入**（见计划原则 6；含 `frontend-design.md` 字体节修订落地）。
- 全部形态以 [blog-reader-prototype.html](../designs/blog-reader-prototype.html) 为准，硬编码色值映射到 token。

#### M6 划词与注释机制（前端闭环）

- DOM Selection → 源节点坐标映射（依赖 M2 source map）。
- TextAnchor v1 创建/校验/重连与黄金 fixture；标题、段落、引用、列表、表格、代码、公式选择矩阵；公式整节点锚定。
- 划词工具条（复制/注释；「询问」在 Agent 接入前不显示）。
- 正文高亮、点击双向定位、失锚展示；注释列表按正文位置排序。
- 注释面板与 composer：走 `discussion` profile 安全渲染（malicious fixture 不执行）；开发仓储 + AuthPort 假身份验证跨用户规则；UI 明确显示「真实发布随登录开放」。

#### M7 导出（Markdown 纯正文 + TXT）

- Export Document IR 与组装器；`body-only` 直接返回通过统一内核校验的不可变 `originalSource`。
- TXT 对全部 P0 节点给出可读投影。
- 导出菜单交互（格式/范围选择、进度、取消、直接下载）；DOCX/PDF 与含讨论范围显示明确「未开放」状态，不做灰色假按钮。

#### M8 上线与整体验收

- `generateMetadata` OG 元信息、分享（Web Share API / 复制链接 + 便签通知）。
- 性能预算实测并记录（规格 13.2：首屏 JS ≤200 KB 等；`$env:ANALYZE='true'; pnpm build`）。
- `edgeone.json` 核验、EdgeOne 正式部署、域名与访问验证。
- 首篇正式文章通过 `content/posts/<slug>/index.md` 全流程发布演练。

### P0 验收

- 中文综合验收文章在 dev 与静态 build 中全部节点（含 8 个自定义标签）正确渲染；未注册组件不会白屏；确定性协议错误带源位置并阻止构建。
- `/blog/` 与 `/blog/<slug>/` 与原型 1:1；书册遮罩、目录双模式、页尾、通知、滚动条、导航命中区逐项通过真实浏览器验证。
- 划词注释全链路（选择矩阵 → 锚定 → 高亮 → 面板 → 假身份写入/编辑/删除）通过；malicious fixtures 不执行、不拖死页面。
- Markdown `body-only` 与 TXT 消费同一 IR；`originalSource` 不被就地修改。
- 单元测试覆盖 parser、schema、registry、profiles、anchors、assets、diagnostics；lint、tsc、build、UTF-8/U+FFFD、链接、静态产物限制全部通过。
- 站点已部署 EdgeOne 并可公网访问；性能预算实测数字已记录。

### P0 明确不做

真实登录/Supabase 写入；评论发布；注释对外写入；DOCX/PDF；在线编辑与 AI；`/notes/` `/works/` `/about/`。

## 五、P1：公开互动与完整导出

### 范围

- **身份**：弹窗式邮箱登录；认证/邮件独立规格（阿里云邮件推送）是进入门；作者白名单由已验证邮箱派生。**阿里云邮件推送先只做基础配置支持（`.env.example`、配置接口、可注入的发送端口），不做真实发送测试**；真实测试在公开写入前补齐。
- **讨论持久化**：**开发与验证期先用本地 Docker 数据库环境（自行启动，schema/RLS/RPC 与 Supabase 兼容），云端 Supabase 迁移后置**；repository、RLS/RPC、anchor manifest 受信校验、级联删除、速率/长度保护、会话撤销；注释从开发仓储切换到真实写入。
- **评论上线**：右栏评论页签 + 整幅页尾评论区接真实数据；回复/编辑/删除交互。
- **审阅导出**：Markdown/TXT 的正文+注释/评论四种组合与审阅附录（附录标签 schema 先锁定并写 fixture）。
- **DOCX/PDF**：中文长文档技术验证（进入门）→ Export IR 投影 → Web Worker 直接下载；禁止 `window.print()`；讨论导出 `snapshotAt` 与分卷降级。
- 首页叙事收尾项（音效点位、待定文案）视进度归入本级。

### P1 验收

沿用原计划 P1/P2 的合并验收：未登录不能写入；登录用户 CRUD 自己内容；作者可删任意讨论、不能编辑他人文字；根线程删除级联无孤儿；XSS/越权/伪造徽标/跨文章锚点测试通过；Windows Chrome/Edge 点击即下载 PDF 无打印对话框；DOCX 在 Word/WPS 打开无修复警告；四种内容范围跨格式语义一致。

### P1 进入门

- 认证/邮件规格、白名单私有配置、Supabase 数据模型、RLS/RPC、不变量、anchor manifest 同步和限流方案全部 accepted，并有跨用户/跨文章测试。
- PDF/DOCX 技术验证通过，依赖安装另行取得授权。
- 公开写入前具备邮箱验证、作者删除和账号/会话撤销。

## 六、P2：作者编辑、AI 与后期治理增强

范围与验收沿用原 P3，不变：

- 作者白名单源码编辑（渲染/源码同页切换）；Supabase 全文草稿 + 正本基线指纹；现算 diff；正式发布回写仓库（需单独授权与安全设计）。
- 划词「询问」接入 AI；AI 只返回建议或明确 diff，未经确认不写正本。
- 确有需求时的同步审核前置钩子、失锚人工认领、可分享注释定位、导出模板、大型文档服务端 fallback。
- 非作者不能进入或调用编辑写入接口；云草稿不改变公开正本；新增治理能力须有真实使用依据。

## 七、工程实践方式：Issue 驱动 + Loop 推进

1. **模块 → parent issue**：P0 的 M1–M8 各对应一个 GitHub parent issue；每个可独立完成的工作单元是一个 sub-issue（GitHub sub-issue 关联）。
2. **创建与实施必须走项目指定 skill**：创建/拆分 issue 用 `issue-creator`；按 issue 做 PR 用 `issue-to-pr`（见 AGENTS.md「Issue 与 PR 协作」）。
3. **Loop 推进**：AI 按依赖顺序逐个领取 sub-issue → 实现 → 通过质量门 → PR 关闭该 issue；一个 PR 默认只关闭一个 issue。
4. **Idea Vault**：未来板块与新灵感一律以评论追加到「Idea Vault」存储 issue，不新开计划文档、不插队进 P0/P1。
5. sub-issue 之间的依赖以 parent issue 中的依赖表为准；可并行的模块（如 M5 与 M2–M4）允许多线推进，但接缝处（DocumentRenderer 接入阅读页）以 M2 契约为准。

## 八、跨阶段质量门

每个 sub-issue 的 PR 合并前：

1. `pnpm lint`；2. `pnpm tsc --noEmit`；3. 相关单元/浏览器/安全测试；4. `pnpm build`；
5. `out/` 单文件 ≤25 MB、总文件数 ≤20,000；6. 严格 UTF-8、无 BOM、无 U+FFFD；
7. Markdown 相对链接有效；8. `git diff --check`；9. 只暂存本单元文件；10. Conventional Commit。

新增依赖、修改 `next.config.ts`/`edgeone.json`/TypeScript/ESLint 配置、删除文件、push 或创建 PR，仍按 AGENTS.md 边界先取得授权。

## 九、已锁定项与待授权/待专项设计

- [x] frontmatter v1、slug 归属、首批 renderer 标签名与最小属性、TextAnchor v1、discussion v1 资源初值（安全 Canvas 清单为空）；
- [x] P0 注释用开发仓储与 AuthPort，P1 替换为 Supabase/真实身份；
- [x] P0 导出范围 = Markdown 纯正文 + TXT；DOCX/PDF 与讨论组合归 P1；
- [x] 字体改用云字体服务，不自托管（见计划原则 6）；
- [x] 每模块拆 GitHub parent + sub-issues，用项目指定 skill 创建与实施；
- [ ] P0 解析、schema 与测试依赖安装授权（M1 进入门）；
- [ ] 云字体服务商选定（国内延迟 + 许可证验证，M5 内决策）；
- [ ] renderer 错误码和综合黄金 fixture；
- [ ] iframe 隔离源、CSP/Permissions Policy 与 `X-Frame-Options: DENY` 的协调方式（M4 html/web 进入门）；
- [ ] Supabase/认证/阿里云邮件独立规格与实现授权（P1 进入门）；
- [ ] PDF/DOCX 技术验证方案及依赖安装授权（P1 进入门）；
- [ ] 思维导图嵌入的正式形态：复用严格 Mermaid `mindmap`，还是新增独立 renderer 标签（不得与已锁定首批标签撞名）。
