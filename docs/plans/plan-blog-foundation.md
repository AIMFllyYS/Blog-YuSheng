# 博客内容系统工程计划（P0–P3）

> Created: 2026-08-15
> Updated: 2026-08-16
> Status: accepted roadmap（进入每阶段前仍须满足对应技术门）
>
> 本计划描述依赖顺序和阶段验收，不替代 [博客内容引擎功能规格](../specs/blog-content-engine.md)。优先级按“错误地基会让多少后续工作返工”排序，不按界面显眼程度排序。

## 一、计划原则

1. 先锁内容协议和 IR，再做页面外观。
2. 先证明一条真实纵向链路，再批量增加 renderer。
3. 评论和注释 UI 可先使用内存/fixture 仓储验证，不让认证阻塞文档内核。
4. 真实 Supabase/Auth/RLS 必须在公开写入前完成，不能用前端按钮隐藏代替权限。
5. PDF/DOCX 在锁依赖前先做中文长文档技术验证。
6. 每个阶段都提交可运行、可测试、可回退的本地 Git checkpoint。
7. 不在本计划中提前实现论坛、投稿、审核状态机、测验后台或私密内容。
8. 阶段中的“进入门”先于编码；未通过门时只能做研究性验证，不能把待决安全契约留给实现者猜。

## 二、阶段依赖图

```text
P0 内容协议与构建内核
  ↓
P1 公开阅读、注册组件、划词与讨论前端
  ↓
P2 真实身份/持久化与多格式直接导出
  ↓
P3 在线编辑、AI 与后期治理增强
```

P0/P1/P2 是博客功能底座的递进完成度；P3 是明确后置的增强能力，不应反向污染前三级契约。

## 三、P0：内容协议、统一 IR 与静态构建闭环

### 目标

证明一篇真实文章可以从 `content/posts/<slug>/index.md` 被发现、严格校验、编译成 Canonical Document IR、生成静态页面、复制合法资产，并从同一 IR 生成最小导出结果。

### 范围

#### 内容仓库与构建

- 建立 `content/posts/<slug>/` 文章包和覆盖中文的验收文章。
- 实现已锁定的 frontmatter v1 最小字段；slug 只取目录名，日期、摘要和封面按功能规格校验。
- 实现文章发现、读取、静态参数、metadata 和文章内资源路径解析。
- 实现路径穿越、重复 ID、缺资源、非法属性、超大文件诊断。
- 建立资产 manifest 与受控复制步骤；验证 EdgeOne 25 MB/20,000 文件限制。
- 处理或移除与静态 export 冲突的 `src/app/api/ping/route.ts`（修改/删除需按项目边界单独确认）。

#### 文档内核

- 建立 Canonical Document IR、SourceRange、稳定块 ID 和 diagnostics。
- 接入 Markdown/GFM、代码、KaTeX、Mermaid 的最小编译链路。
- 建立 renderer definition、静态 registry 和 profile 类型。
- 建立未知标签/非法节点 fallback。
- 建立 `article`、`discussion`、`editor-preview` 屏幕 profile 与独立的 export projection policy 骨架。
- 建立统一 `DocumentRenderer`，页面层只组合。

#### 最小路由与验证页

- `/blog/` 可列出构建期文章。
- `/blog/<slug>/` 通过 `generateStaticParams` 静态生成。
- `_dev/` 提供覆盖合法/非法节点的调试页，带 production `notFound()` 守卫。
- 暂不追求完整书屋视觉和三栏交互，但不能绕过正式内核。

#### 最小导出契约

- 建立 Export Document IR。
- 编译结果保存不可变 `originalSource`；`body-only` Markdown 直接返回通过统一内核校验的原始正本。
- TXT 能对基础节点给出可读投影。
- DOCX/PDF 只建立接口和显式“不支持”诊断，不在 P0 仓促锁库。

### P0 验收

- 一篇中文综合 fixture 在 dev 和静态 build 均正确显示 Markdown、代码、公式、Mermaid。
- 非法标签、重复 ID、路径穿越、缺资源会产生带源位置的确定性错误。
- 未注册组件不会使整篇页面白屏。
- `generateStaticParams` 枚举全部文章，URL 使用尾随斜杠。
- 正文、目录和 TXT 最小导出消费同一 IR；Markdown 纯正文读取同一编译结果中的 `originalSource`。
- 单元测试覆盖 parser、schema、registry、profiles、assets、diagnostics。
- lint、tsc、build、UTF-8/U+FFFD、链接、静态产物限制全部通过。

### P0 进入门

- 依赖清单和测试栈先获安装授权；默认候选为 Vitest（单元/契约）与 Playwright（真实浏览器），最终以授权后的 `package.json` 脚本为准。
- frontmatter、首批标签名、diagnostic 分级、original source 与 anchor protocol 先固化为 schema/fixture。
- 综合 fixture 可以使用专门验收文章，不要求用户先写正式博客正文。

### P0 明确不做

- 真实登录/Supabase 写入；
- 正式评论/注释发布；
- Canvas/HTML/网页全部实现；
- 完整 DOCX/PDF；
- 在线编辑和 AI。

## 四、P1：公开阅读、首批 Renderer 与讨论前端闭环

### 目标

完成不依赖真实账号服务也能浏览和验收的核心产品体验：文章三栏、首批注册组件、划词注释、文章评论、回复/编辑/删除交互，以及安全 discussion profile。

### 范围

#### 阅读体验

- 书架/书屋风 `/blog/` 列表。
- 三栏阅读布局：目录 / 正文 / 评论、注释、Agent 工作区；下接整幅页尾评论区。
- `/blog/` 与 `/blog/<slug>/` 的视觉与交互 **1:1 对标** [blog-reader-prototype.html](../designs/blog-reader-prototype.html)，不得另起一套外观。
- 中小屏抽屉、悬浮入口、键盘与 reduced motion。
- 标题锚点、目录提取、分享基础和 OG metadata。
- 图形目录是文章的骨架屏缩略：只画一级标题 + 正文骨架（不拆二三四级）。条数按该节去空白字数在篇内相对映射（最短最少、最长最多，2–8 条，末条吃余数），禁止开方压平。三类嵌入微标只挂在一级标题行，各用不同语义色（自定义标签 / 图片 / 思维导图；**音频不进微标**）。虚线视口框只定位。公式与实现以 [blog-reader-prototype.html](../designs/blog-reader-prototype.html) 为准。

#### 首批 Renderer

- 普通图片、高级图片基础、视频、音频。
- 思维导图：P1 可先复用严格 Mermaid `mindmap`；是否另立 renderer 标签见文末待锁定项。音频组件照常渲染，但不进入图形目录微标。
- Canvas 注册机制和至少一个函数图像示例。
- SVG 资源引用与矢量/PNG fallback。
- 本地 HTML sandbox、站内/自有/第三方网页尽力嵌入与预览卡片降级。
- 选择题、填空题纯前端自测。
- 每个 renderer 完成 schema、screen、fallback、导出占位/投影和测试。

#### Discussion 安全渲染

- 实现 discussion profile 允许清单、资源限制、安全 URL 和最终 sanitize。
- 允许 Markdown、代码、表格、KaTeX、严格 Mermaid。
- v1 discussion 不开放 Canvas；题目默认关闭。以后只有集中 allowlist 中通过专项审查的固定组件可开放。
- 禁止原始 HTML、图片、音视频、SVG/HTML/网页嵌入、iframe、任意 JS/CSS 和动态 import。
- 禁止标签发布时返回具体错误；代码示例通过代码围栏安全显示。

#### 划词与注释前端

- DOM Selection 映射到源节点坐标。
- 单语义块选区、复制/询问占位/注释工具条。
- 标题、段落、引用、列表、表格、代码、公式选择矩阵。
- 公式整节点锚定、正文高亮、点击双向定位、失锚展示。
- 注释列表按正文位置排序。

#### 评论/注释交互

- 评论是文章级，注释是选区级；UI 和输入入口不混用。
- 共用线程、回复、作者/访客徽标、编辑自己、删除与级联确认。
- 使用内存或开发 fixture repository 验证跨用户规则；不伪装成真实线上持久化。
- AuthPort/PermissionPolicy 只定义接口，开发环境注入可控假身份。

#### Markdown/TXT 审阅导出

- 实现四种正文/注释/评论组合。
- 审阅附录保留锚点、引语、作者、时间、编辑时间和回复树。
- 原始正本不被就地修改。

### P1 验收

- 真实浏览器验证评论入口、划词注释入口、右侧双面板和响应式抽屉。
- 可选择节点矩阵逐项通过；自定义 renderer 内部文字不可误选。
- malicious fixtures（script、事件属性、危险 URL、超限 Mermaid/KaTeX）不会执行或拖死页面。
- 所有首批 renderer 都有屏幕、失败、Markdown/TXT、PDF/DOCX fallback fixture。
- 四种 Markdown 导出能让无上下文 AI 正确定位注释/评论目标。
- 未接真实身份时，产品明确显示功能状态，不声称评论已线上可用。

### P1 进入门

- iframe 隔离源、精确 sandbox/CSP/Permissions Policy/`referrerPolicy` 和 `X-Frame-Options` 路由策略通过安全审查；未通过时 HTML/网页 renderer 只能展示 fallback 卡片。
- discussion 集中 allowlist、资源上限、KaTeX/Mermaid 安全参数和超时/隔离策略成为可执行配置。
- TextAnchor 的 UTF-16 offset、canonicalText、fingerprint、manifest 和状态枚举均已有黄金 fixture。

## 五、P2：真实身份、公开持久化与 DOCX/PDF 直接下载

### 目标

把 P1 的完整前端交互接入真实公开数据和直接下载导出；只有本节进入门全部通过后，评论、注释、回复、编辑自己内容、删除和多格式导出才可称为达到可上线状态。

### 前置技术验证

- 对 PDF 候选进行中文长文档、字体嵌入/子集、分页、代码、表格、KaTeX、Mermaid/SVG、Canvas 快照和包体积验证。
- 对 DOCX 候选进行 OOXML 合法性、WPS/Word 打开、中文、表格、图片、公式和评论附录验证。
- 记录选择理由、失败案例、替代方案；未通过验证不安装为正式依赖。

### 范围

#### 身份与权限

- 弹窗式邮箱登录；P2 开工前新增并接受认证/邮件独立规格，明确认证提供方与阿里云邮件推送接口。
- 作者白名单使用已验证邮箱派生，不暴露邮箱，不接受客户端自报作者身份。
- Supabase RLS/RPC 验证：`authorId` 由 `auth.uid()` 派生；登录用户创建；仅 owner 编辑/删除自己内容；作者可删除任意讨论；作者不能编辑他人文字；结构列更新不可变。
- 登录前输入内容在登录成功后仍保留。

#### 讨论持久化

- 实现 Supabase discussion repository。
- 文章评论、选区注释、回复、编辑 `updatedAt`、硬删除和级联删除。
- 构建期 anchor manifest 同步到受信校验边界；annotation 写入校验文章版本、块、UTF-16 offset 与 exact，拒绝跨文章和伪造锚点。
- 读取、写入、删除错误有可恢复反馈。
- 不引入审核状态机、软删除、编辑历史、点赞或通知。
- 增加邮箱验证、服务端速率/长度保护、账号/会话紧急撤销和作者删除；不扩张为论坛治理后台，不保存已删除正文。

#### DOCX

- 从 Export Document IR 生成合法 `.docx` Blob 并直接下载。
- 结构化标题、段落、列表、表格、引用、代码、图片、公式和讨论附录。
- 组件使用专用投影或显式 fallback。

#### PDF

- 从 Export Document IR 生成 PDF Blob 并直接下载；禁止 `window.print()`。
- 文本可选择；中文、分页、目录/页码、代码换页和长链接可用。
- Mermaid/SVG 优先矢量；Canvas 使用快照；HTML/网页使用截图或预览卡片；音视频使用静态信息。
- 导出器动态加载，有进度、取消、节点级失败诊断。
- 讨论导出使用 `snapshotAt` 与游标分页；超过 500 条或 5 MB 时明确分卷/仅正文降级，不假装已导出全部。
- 每种格式重新通过 discussion profile 和目标编码；DOCX/PDF 禁止 active content，服务端不得抓取用户 URL。

### P2 进入门

- 认证/邮件规格、白名单私有配置、Supabase 数据模型、RLS/RPC、不变量、anchor manifest 同步和限流方案全部 accepted，并有跨用户/跨文章测试。
- PDF/DOCX 技术验证通过，依赖安装另行取得授权。
- 公开写入前具备邮箱验证、作者删除和账号/会话撤销，不要求审核状态机或软删除。

### P2 验收

- 未登录用户不能写入，登录用户能创建评论/注释/回复并编辑/删除自己内容。
- 作者可删除任意讨论；无法编辑其他用户文字。文章编辑能力属于 P3，P2 只验证作者身份接口，不显示可用编辑入口。
- 根线程删除确实级联回复，数据库无孤儿记录。
- XSS、越权、伪造作者邮箱/徽标、危险 URL 和跨文章锚点测试通过。
- Windows Chrome/Edge 点击即可下载 PDF，不出现打印机或系统打印对话框。
- DOCX 在 Microsoft Word 与 WPS 打开无修复警告；PDF 在常见阅读器中文正常。
- 四种内容范围在 Markdown/TXT/DOCX/PDF 中语义一致。

## 六、P3：作者编辑、AI 与后期治理增强

### 目标

在公开博客底座稳定后，接入作者生产力和确有需求时的治理能力，不改变正本、讨论和导出基础契约。

### 范围

- 作者白名单源码编辑：渲染/源码同页切换。
- Supabase 全文草稿 + 正本基线指纹；保存覆盖，不存历史。
- 草稿/正本现算 diff；过期基线提示。
- 正式发布回写仓库与部署流程（需单独授权和安全设计）。
- 划词“询问”接入 AI，定义选区/标题路径/文章上下文协议。
- AI 根据审阅附录生成建议，不直接破坏性改写正本。
- 如真实评论量需要，再引入同步自动审核前置钩子；人工审核需独立队列，不污染公开表状态。
- 注释失锚人工认领、可分享注释定位、导出模板和大型文档服务端 fallback。

### P3 验收

- 非作者不能进入或调用文章编辑写入接口。
- 云草稿不改变公开正本；基线变化有明确冲突提示。
- AI 只返回建议或明确 diff，未经确认不写正本。
- 新增治理能力有真实使用依据，不提前引入论坛式复杂度。

## 七、跨阶段质量门

每个阶段提交前：

1. `pnpm lint`；
2. `pnpm tsc --noEmit`；
3. 相关单元/浏览器/安全测试；
4. `pnpm build`；
5. `out/` 单文件 ≤25 MB、总文件数 ≤20,000；
6. 严格 UTF-8、无 BOM、无 U+FFFD；
7. Markdown 相对链接有效；
8. `git diff --check`；
9. 只暂存本阶段文件；
10. Conventional Commit 本地提交。

新增依赖、修改 `next.config.ts`/`edgeone.json`/TypeScript/ESLint 配置、删除文件、push 或创建 PR，仍按 AGENTS.md 边界先取得授权。

## 八、已锁定项与待授权/待专项设计

- [x] frontmatter v1 最小字段、slug 归属、首批 renderer 标签名与最小属性；
- [x] TextAnchor v1 offset/规范化/fingerprint/状态方向；
- [x] discussion v1 资源初值与安全 Canvas 清单为空；
- [x] P1 使用开发仓储与 AuthPort，P2 再替换为 Supabase/真实身份；
- [ ] P0 解析、schema 与测试依赖安装授权；
- [ ] renderer 错误码和综合黄金 fixture；
- [ ] Supabase/认证/阿里云邮件独立规格与实现授权；
- [ ] PDF/DOCX 技术验证方案及依赖安装授权；
- [ ] iframe 隔离源、CSP/Permissions Policy 与当前 `X-Frame-Options: DENY` 的协调方式；
- [ ] 每阶段是否另拆 GitHub Issues（创建时必须使用项目指定 skill）。
- [ ] 思维导图嵌入的正式形态：复用严格 Mermaid `mindmap`，还是新增独立 renderer 标签（不得与已锁定首批标签撞名）。
