# 博客内容引擎与公开讨论功能规格

> Created: 2026-08-15
> Updated: 2026-08-15
> Status: accepted baseline（已决策项可实施；阶段进入门见第十五节）
>
> 本规格定义博客文章从仓库 Markdown 到屏幕、评论/注释和多格式导出的统一契约。总体决策见 [博客整体架构设计](../designs/architecture-overview.md)，目录归属见 [项目结构与文件组织](../conventions/project-structure.md)。

## 一、背景

博客需要在保持 Markdown 可读、可 Git diff、可被 AI 直接修改的前提下，渲染公式、图表、媒体、Canvas、SVG、HTML、网页和轻量问答题；同时支持文章级评论、选区级注释，以及 Markdown、TXT、DOCX、PDF 导出。

如果屏幕阅读、评论富文本和导出分别解析字符串，会产生不一致、内容丢失和安全漏洞。因此所有消费者必须建立在同一 Canonical Document IR 与 renderer registry 上，仅通过 profile 控制能力范围。

## 二、目标与非目标

### 2.1 目标

- `content/posts/<slug>/index.md` 是正式文章唯一权威源。
- 一份内容经统一编译后服务屏幕、目录、选区、讨论渲染和导出。
- 新增 renderer 时可局部实现、测试和升级，不修改所有消费页面。
- 评论与注释支持安全富文本，但永不执行用户提供的任意代码。
- Markdown 导出保留正本并提供 AI 可定位的审阅附录。
- DOCX/PDF 是直接下载的结构化文件；PDF 不唤起系统打印。
- 所有错误具有文章、标签/节点、源位置和错误码，中文安全降级。

### 2.2 非目标

- 多人投稿、作者团队和文章审核流；
- 私密文章、私人注释和分级可见性；
- 论坛、点赞、举报、通知、积分、热榜；
- 测验成绩、统计、排行、学习档案；
- 评论编辑历史、软删除、墓碑和回收站；
- 评论内任意 HTML/JS/CSS、iframe、动态 import；
- PDF 逐像素复刻动态网页和播放器；
- 第一阶段完成真实登录、在线编辑、AI 修改或人工审核。

## 三、领域术语

| 术语 | 定义 |
|---|---|
| 正本 | 仓库中的 `index.md`；正式发布内容唯一权威源 |
| Canonical Document IR | 解析、校验后与输出格式无关的规范文档模型 |
| Renderer | 一类文档节点的 schema、编译、屏幕、导出、安全和降级能力集合 |
| Profile | 同一注册表在特定消费场景下的允许能力和资源限制 |
| 评论 | 针对整篇文章的公开线程，不含文本锚点 |
| 注释 | 针对一个稳定文本选区的公开线程，必须含锚点 |
| 回复 | 根评论/注释下的消息；继承根线程目标 |
| 匿名读者 `anonymous` | 未登录，只能读取公开内容 |
| 普通成员 `member` | 已登录且不在作者白名单，可发布并维护自己的讨论内容 |
| 作者 `author` | 已验证登录邮箱命中作者白名单的最高权限用户 |
| 展示徽标 | 讨论内容只显示“作者”或“访客”；其中“访客”是展示文案，不代表未登录权限身份 |
| 审阅附录 | Markdown 导出末尾携带注释/评论定位与线程的结构化区域 |

## 四、文章包与源格式

### 4.1 文章包

```text
content/posts/<slug>/
├── index.md
├── data/
├── media/
└── embeds/
```

- slug 为小写英文 kebab-case，与 `/blog/<slug>/` 一致。
- 相对资源路径必须限制在当前文章包内，拒绝路径穿越。
- 构建只复制被允许且通过验证的文章资源。
- frontmatter v1 必填 `schemaVersion: 1`、`title`、`description`、`publishedAt`；可选 `updatedAt`、`cover`、`tags`、`draft`。slug 只来自目录名，不写入 frontmatter。
- 日期使用带时区的 ISO 8601；`cover` 是文章包内相对路径；未知字段默认报错，新增字段必须升级 schema 或明确向后兼容。

### 4.2 内置语法

- CommonMark 基线；
- GFM 表格、删除线、任务列表等明确启用的扩展；
- KaTeX：`$...$` 行内、`$$...$$` 块级；
- Mermaid：`mermaid` 围栏代码块；
- 标准 Markdown 图片语法；
- Markdown 正文中的任意 raw HTML 默认禁用；需要 HTML 时必须使用 `<html-embed>` 引用文章包内文件并进入 sandbox iframe。自定义 XML 标签只按白名单解析，不等同于允许任意 HTML。

### 4.3 自定义标签语法

```markdown
<video-embed id="demo" src="./media/video/demo.mp4" poster="./media/images/poster.webp" />

<html-embed id="calculator" src="./embeds/calculator/index.html">
无法加载时，请使用降级链接查看。
</html-embed>
```

规则：

1. 名称小写 kebab-case；
2. `id` 必填且文章内唯一；
3. 纯引用组件自闭合，有子内容组件成对闭合；
4. 属性只接受 schema 声明的字符串、数字、布尔、枚举和相对路径；
5. 复杂数据用 `data-src` 外置；
6. 禁止表达式、事件属性、内联脚本和用户控制的模块路径；
7. 未注册标签、重复 ID、未知属性、类型错误和资源失效必须产生诊断；
8. 解析器应容忍属性换行，不以视觉排版影响语义。

首批标签名锁定为 `<video-embed>`、`<audio-embed>`、`<canvas-render>`、`<svg-embed>`、`<html-embed>`、`<web-embed>`、`<choice-question>`、`<fill-blank-question>`；标准图片继续使用 Markdown 图片语法。逐项属性 schema 在对应 renderer 的 `schema.ts` 中定义，但不得另起同义标签。

v1 最小属性：

| 标签 | 必填 | 可选 | 说明 |
|---|---|---|---|
| `video-embed` | `id`, `src`, `title` | `poster` | `src`/`poster` 为文章包资源 |
| `audio-embed` | `id`, `src`, `title` | — | `src` 为文章包资源 |
| `canvas-render` | `id`, `renderer` | `data-src`, `width`, `height` | `renderer` 只能命中静态注册键 |
| `svg-embed` | `id`, `src`, `title` | — | `src` 指向 `media/svg/` |
| `html-embed` | `id`, `src`, `title` | `height` | `src` 指向 `embeds/<id>/index.html` |
| `web-embed` | `id`, `src`, `title` | `height` | `src` 必须命中 URL/域名策略 |
| `choice-question` | `id`, `data-src` | — | JSON 定义题干、选项、答案、解析 |
| `fill-blank-question` | `id`, `data-src` | — | JSON 定义题干、可接受答案、解析 |

除表中字段外一律拒绝；后续新增可选字段必须保持旧文章可解析。作者偏好的标准写法是单行标签，属性换行只是兼容能力。

## 五、Canonical Document IR

### 5.1 基础节点

```ts
type SourceRange = {
  start: { line: number; column: number; offset: number }
  end: { line: number; column: number; offset: number }
}

type DocumentNodeBase = {
  nodeId: string
  type: string
  sourceRange: SourceRange
  sourceText?: string
}

type CompiledDocument = {
  schemaVersion: 1
  articleSlug: string
  documentFingerprint: string
  frontmatter: unknown
  root: DocumentNodeBase
  originalSource: string
  assetManifest: readonly unknown[]
}
```

规范节点至少覆盖：root、heading、paragraph、text、emphasis、strong、link、list、quote、table、inlineCode、code、math、mermaid、image 和 registeredComponent。

### 5.2 稳定 ID

- 自定义组件使用作者提供的 `id`。
- 标题 ID 使用规范化标题文本生成 slug；同一文档内重复标题按出现顺序追加确定性后缀 `-2`、`-3`。标题文字或重复标题顺序发生变化时深链可能变化，不承诺虚假的永久稳定。
- 普通语义块由编译器生成稳定块 ID，不要求作者给每段手工编号。
- 普通块 ID 结合标题路径、块类型、同级序号和内容指纹；协议版本写入编译结果。正文小改动时由引语/上下文负责重连，不能把块 ID 当成唯一恢复手段。
- DOM 必须携带源映射数据，供 Selection Range 转换，不能把 DOM 层级作为持久化锚点。

DOM 源映射属性名是跨模块契约（编译期写入、划词侧读取），固定为：

| 属性 | 挂载位置 | 值 |
|---|---|---|
| `data-block-id` | 每个语义块的最外层元素 | 5.2 的稳定块 ID |
| `data-node-id` | 需要整节点锚定的 renderer 根元素（公式、注册组件等） | 该节点的 `nodeId` |
| `data-selectable` | 同上 | `none` 表示只能整节点选中，不进入字符级偏移 |

`documentFingerprint` 是对**规范化后的编译输入**取版本化 SHA-256：输入为 `index.md` 原文，先统一换行为 LF、去除 BOM、按 NFC 规范化，再连同协议版本号一起摘要；不含资产字节，也不含构建时间等易变量。

### 5.3 诊断

```ts
type DocumentDiagnostic = {
  code: string
  severity: 'error' | 'warning'
  message: string
  articleSlug: string
  nodeId?: string
  sourceRange?: SourceRange
}
```

- 仓库正文的确定性协议错误（未知标签、非法属性、重复 ID、路径逃逸、必需资源缺失）为 `error` 并阻止正式构建；可选元信息缺失、可回退的远程预览失败为 `warning`。
- `discussion` 写入中的协议或安全错误拒绝本条写入，不影响文章构建；运行时资源故障只隔离当前节点并显示 fallback。
- 正式构建不得吞掉异常后输出缺内容的页面。
- 开发预览显示完整诊断块；生产 fallback 只应对运行时资源失效、旧版本内容或客户端 renderer 崩溃，不允许把已知正文 `error` 带入新部署。

| 场景 | 阶段/Profile | 结果 | 是否允许继续 |
|---|---|---|---|
| 未注册标签、非法属性、重复 ID、路径逃逸、必需本地资源缺失 | 构建期 `article` | `error` + 源位置 | 阻止本次正式构建 |
| 可选元信息缺失、远程网页拒绝嵌入但有链接 fallback | 构建期 `article` | `warning` | 允许构建并显示 fallback |
| 禁止组件、危险 URL、超限输入 | 写入期 `discussion` | 字段级错误 | 只拒绝本条写入 |
| 历史内容不再符合当前 `discussion` profile | 读取期 `discussion` | 不渲染危险节点，显示安全错误卡 | 页面继续，记录诊断 |
| 资源临时失败或 renderer 崩溃 | 生产运行时 | 节点级 fallback + 关联 ID | 页面与其他节点继续 |

## 六、Renderer 注册契约

```ts
type RenderProfile =
  | 'article'
  | 'discussion'
  | 'editor-preview'

type RendererDefinition = {
  name: string
  version: number
  allowedProfiles: readonly RenderProfile[]
  discussionCandidate: boolean
  schema: unknown
  compile: unknown
  collectAssets: unknown
  renderScreen: unknown
  renderMarkdown: unknown
  renderText: unknown
  renderDocx: unknown
  renderPdf: unknown
  renderFallback: unknown
  security: {
    trustLevel: 'native' | 'registered' | 'sandboxed'
    allowsScript: boolean
    allowsExternalResource: boolean
    maxSourceLength?: number
    maxInstancesPerDocument?: number
  }
  selectable: 'text-range' | 'whole-node' | 'none'
}
```

要求：

- 注册键静态映射到仓库代码，禁止 `import(userInput)`。
- 每个 renderer 的 schema 必须拒绝未知字段或明确说明兼容策略。
- `discussionCandidate` 只是组件自我声明；能否进入不可信输入路径仍由独立、集中维护的 `discussion` profile allowlist 决定，不能通过切换一个布尔值自行放行。
- 缺少 DOCX/PDF 专用实现时必须提供 fallback，不能静默丢节点。
- renderer 版本用于协议迁移，不使用包版本替代内容协议版本。
- 屏幕渲染组件必须遵守主题 token、reduced motion、键盘操作和响应式规则。
- `export` 不是屏幕 `RenderProfile`。导出组装器把 Canonical IR 投影为 Export Document IR，再调用 renderer 的各格式投影；`DocumentRenderer` 不接收 `export`。

## 七、Profile 与安全策略

### 7.1 `article`

来源是仓库白名单编辑者维护的文章。可使用完整注册表，但：

- HTML/网页仍在 sandbox iframe 中运行；
- Markdown raw HTML 禁用；可执行 HTML 只能来自文章包 `<html-embed>`。
- SVG 构建期验证后默认以 `<img>`/独立资源方式加载，不内联进父页面 DOM；拒绝脚本、事件属性、`foreignObject`、外部资源引用、危险协议和超限滤镜/路径。屏幕与导出复用同一安全投影。
- URL、路径、资源大小和 iframe 权限仍需 schema 验证；
- 文章信任不能扩散为父页面任意代码执行权。

iframe v1 基线：

- 本地 HTML 默认 `sandbox="allow-scripts"`，不允许 `allow-same-origin`、表单、弹窗、下载、顶层导航、modals、剪贴板或未声明权限；额外能力必须由 renderer 固定配置而非文章参数任意开启。
- 站内页面若依赖同源 Cookie/存储，不得把 `allow-scripts` 与 `allow-same-origin` 组合在同一主站源上；v1 应降级或使用隔离源。
- 第三方 URL 必须命中集中 allowlist；远端拒绝嵌入时显示标题、说明与普通链接，不尝试绕过。
- `postMessage` 同时校验 `event.source`、一次性 capability nonce 和严格消息 schema；opaque origin 下不得仅依赖 `event.origin`。
- CSP、Permissions Policy、`referrerPolicy` 与站内嵌入页的响应头必须在开始 iframe renderer 前锁定。

### 7.2 `discussion`

评论、注释、回复是永久不可信输入，即使用户已登录。

默认允许：Markdown、列表、引用、表格、链接、行内/块代码、KaTeX、严格模式 Mermaid，以及同时通过集中 allowlist 和安全审查的注册组件。

默认禁止：原始 HTML、任意 JS/CSS、图片、视频、音频、SVG/HTML/网页嵌入、iframe、危险 URL、事件属性和任意动态模块路径。

写入流程：解析 → profile/schema/资源上限验证 → 不合规则整条拒绝并给出具体提示 → 保存原始讨论源码。

读取流程：读取原始源码 → 重新解析 → 再次 profile 验证 → 完成受控转换 → 最终 sanitize → React 渲染。

不得只保存清洗后的 HTML；不得因为内容已在数据库就跳过读取时验证。

### 7.3 v1 资源上限

| 项目 | 建议初值 |
|---|---:|
| 单条讨论源码 | 10,000 字符 |
| 单条 Mermaid | 5,000 字符 |
| 单条 Mermaid 数量 | 3 |
| 单条安全 Canvas 数量 | 3 |
| 单条公式数量 | 50 |
| 列表/引用嵌套 | 6 层 |
| 表格 | 50 行 × 20 列 |
| 单代码块 | 8,000 字符 |
| 单线程回复深度 | 5 层 |
| 单次讨论列表读取 | 50 条，游标分页 |
| 单篇文章一次导出讨论 | 500 条或 5 MB 原始源码，先到者为准 |

上限必须集中配置并有测试，不能散落在 UI 中。解析器另设 AST/DOM 节点总数、KaTeX 宏/递归、Mermaid 输入/输出/超时、Canvas 尺寸/执行时间和同一账号/文章写入频率限制；超过上限拒绝当前内容或节点，不能卡死整页。首批不开放 discussion Canvas，后续只有通过专项审查的固定 renderer 才能加入 allowlist。

### 7.4 URL 与链接

- 讨论链接只允许明确协议白名单；至少支持 HTTPS/HTTP，`mailto:` 是否启用由实现期确认。
- 禁止 `javascript:`、`data:`、`vbscript:`、`file:`。
- 用户链接增加 `nofollow ugc noopener noreferrer`。
- 用户输入的 ID/name 需防止 DOM clobbering；sanitize 必须在最后一个不安全转换之后执行。
- KaTeX 使用不信任模式并限制宏展开；Mermaid 使用严格安全模式，禁用用户点击脚本/任意链接，并对生成 SVG 再做安全清洗。
- 所有 `dangerouslySetInnerHTML` 汇入单一受审入口；sanitizer 之后禁止继续拼接用户字符串。

## 八、首批 Renderer 行为矩阵

| 节点 | 正文 | 讨论 | 可划词 | PDF | DOCX/TXT 降级 |
|---|:---:|:---:|:---:|---|---|
| Markdown 文本 | ✅ | ✅ | ✅ | 可选择文本 | 结构化文本 |
| 代码 | ✅ | ✅ | ✅ | 等宽代码块 | 代码块 |
| KaTeX | ✅ | ✅ | 整个公式 | 矢量/高质量图 | 公式或高质量图/TeX |
| Mermaid | ✅ | ✅（严格模式） | ❌ | SVG 优先 | 图形或源码说明 |
| 普通图片 | ✅ | ❌ | ❌ | 原图缩放 | 图片/alt |
| 视频 | ✅ | ❌ | ❌ | poster+标题+URL | 同左/文本链接 |
| 音频 | ✅ | ❌ | ❌ | 标题+时长+URL | 同左/文本链接 |
| Canvas | ✅ | 仅安全注册项 | ❌ | PNG/SVG 快照 | 快照/文字说明 |
| SVG | ✅ | ❌ | ❌ | 矢量优先 | SVG/PNG/说明 |
| 本地 HTML | ✅ 沙箱 | ❌ | ❌ | 截图/降级卡片 | 截图/标题+URL |
| 网页 | ✅ 尽力 iframe | ❌ | ❌ | 预览卡片 | 标题+URL |
| 选择题 | ✅ | 默认关闭 | ❌ | 静态题面 | 题面，可选答案 |
| 填空题 | ✅ | 默认关闭 | ❌ | 静态题面 | 题面，可选答案 |

## 九、评论、注释与回复

### 9.1 统一线程基础

```ts
type CommentThread = {
  id: string
  articleSlug: string
  kind: 'comment'
  anchor: null
  createdAt: string
  updatedAt: string
}

type AnnotationThread = {
  id: string
  articleSlug: string
  kind: 'annotation'
  anchor: TextAnchor
  anchorState: 'attached' | 'reattached' | 'orphaned'
  createdAt: string
  updatedAt: string
}

type DiscussionThread = CommentThread | AnnotationThread

type DiscussionEntry = {
  id: string
  threadId: string
  parentId: string | null
  source: string
  sourceFormat: 'blog-markdown-v1'
  authorId: string
  authorDisplayNameSnapshot: string
  createdAt: string
  updatedAt: string
}
```

- comment 与 annotation 必须使用判别联合和 schema refinement，非法的 kind/anchor 组合不能进入仓储。
- 一个 thread 恰好有一个 `parentId = null` 的根 entry；创建 thread 与根 entry 必须在一个受控事务/RPC 内完成。
- 回复继承线程目标；回复本身不创建锚点。
- 回复的 `parentId` 必须属于同一 thread，禁止环、跨 thread/跨文章挂接和超过 5 层嵌套。
- 评论与注释分别查询和展示，但共用 entry、回复、编辑、删除和渲染基础。

### 9.2 权限

- 匿名读者：只读。
- 普通成员：创建评论/注释/回复；编辑、删除自己的 entry。
- 作者：与普通用户相同的编辑限制；另可删除任意线程/entry、编辑文章。
- 作者身份由已验证邮箱与白名单比较后派生；普通内容授权以不可伪造的认证 user ID 为准。
- 前端不得提交或持久化可由用户控制的 `isAuthor` 作为权限依据。
- 白名单只存在于受信任服务端/数据库私有配置；邮箱比较前做大小写和 Unicode 规范化，并要求认证提供方已确认邮箱。最终授权主体仍绑定稳定 user ID。

公开写入的数据库不变量：

- `authorId`、`createdAt` 由认证上下文/数据库生成且更新时不可变；客户端不能改变 `threadId`、`parentId`、`sourceFormat`、文章归属或锚点身份字段。
- RLS/RPC 分别声明匿名读取、登录插入、owner 更新/删除、作者全局删除的 `USING` 与 `WITH CHECK`，不能只靠前端隐藏按钮。
- comment 必须没有 anchor；annotation 必须携带通过当前文章 anchor manifest 校验的 anchor。
- 级联删除由受控数据库事务/RPC 执行；作者删除父级时级联他人回复是明确授权行为。
- P2 公开写入前必须具备邮箱验证、服务端速率/长度限制、作者删除和账号/会话紧急撤销能力；不因此引入审核状态机、软删除、举报后台或保留已删除正文。

### 9.3 编辑与删除

- 编辑只允许修改 `source`，由数据库更新 `updatedAt`；不记录历史。
- 作者也不能编辑他人文本。
- 删除根 entry 即删除 thread 并级联全部回复；删除任意中间回复级联其回复子树。
- 删除为硬删除，执行前 UI 必须明确提示影响范围。

### 9.4 展示

- 每条 entry 显示公开名称、作者/访客徽标、创建时间和可选“已编辑”。
- 不公开登录邮箱。
- 公开名称使用发布时快照，避免账号改名破坏历史导出；作者/访客徽标按读取时受信白名单动态派生，不由快照授予权限。
- 评论区按线程时间排序规则由实现期确定；注释区默认按正文锚点顺序，同锚点内按时间。

## 十、Text Anchor 与划词助手

```ts
type TextAnchor = {
  protocolVersion: 1
  articleSlug: string
  documentFingerprint: string
  startBlockId: string
  startOffset: number
  endBlockId: string
  endOffset: number
  exact: string
  prefix: string
  suffix: string
  headingPath: string[]
}
```

- 工具条：复制 / 询问（接口占位）/ 注释。
- 第一版强制 `startBlockId === endBlockId`，即限制在一个语义块；允许跨行内样式产生的多个 DOM Text Node，但不跨段落、标题、列表项、表格单元格或组件边界。
- offset 一律为 Canonical IR 节点 `canonicalText` 的 UTF-16 code unit 索引，与浏览器 Selection/Range 一致；必须满足 `0 <= startOffset < endOffset <= canonicalText.length`。
- 普通文本的 `canonicalText` 使用 LF、Unicode NFC，并由编译期 source map 处理 Markdown 标记、实体和软换行；代码保留源码字符，仅把 CRLF 规范为 LF。
- `exact` 必须等于区间文本；`prefix`/`suffix` 各最多保存相邻 32 个 UTF-16 code units。数据库限制各字段长度并拒绝越界或不一致数据。
- KaTeX 选择任意视觉部分都归一为完整公式节点，保存原始 TeX。
- v1 中自定义 renderer 一律 `selectable = none`；`whole-node` 只是未来协议预留，不在 P1 开放。
- `documentFingerprint` 是规范化文章编译输入的版本化 SHA-256；构建同时产出只读 anchor manifest。P2 写入通过受控 RPC/Edge Function 对 manifest 校验 article、fingerprint、block、offset 和 exact，不接受客户端自证。
- 新旧页面版本竞争时只接受当前及紧邻上一部署 manifest；更旧版本要求客户端刷新后重建锚点。
- 重连顺序为块 ID/位置 → exact+上下文 → 标题路径；结果写入/派生为 `attached`、`reattached` 或 `orphaned`。失败仍保留在线程列表，不能静默删除。

## 十一、轻量问答

- 选择题支持单选/多选；填空题支持一个或多个可接受答案。
- 判分完全在浏览器完成；不写数据库、不统计、不排行。
- 可配置忽略首尾空格和英文大小写；不做 AI 语义判分。
- 刷新后可以重置；不要求跨设备保存。
- 复杂题目数据放 `data/*.json`，schema 构建期校验。
- DOCX/PDF 默认输出题面，并可选择是否包含答案与解析。

## 十二、导出规格

### 12.1 内容范围

```ts
type DiscussionExportScope =
  | 'body-only'
  | 'body-with-annotations'
  | 'body-with-comments'
  | 'body-with-all-discussions'
```

所有公开讨论均导出，保留作者公开名、作者/访客身份、创建/更新时间和回复关系。点击导出时按游标读取并固定 `snapshotAt`；只包含 `createdAt <= snapshotAt` 的记录。超过 500 条或 5 MB 时停止讨论导出并提示分卷/仅正文，不能让浏览器失控。

### 12.2 Markdown

- `originalSource` 是 `index.md` 的**完整原文，含 frontmatter**，以 UTF-8 无 BOM、LF 换行保存；编译器只读不改。`body-only` 的下载物就是它逐字节原样输出，因此与源文件整文件一致（而不是去掉 frontmatter 后的片段）。
- `body-only` 直接返回编译结果保留的不可变 `originalSource`，而不是试图从 IR 反向猜回空行、属性顺序和围栏格式；同时仍要求该 source 已通过同一 parser/IR 校验。
- 其他模式在原文后追加审阅附录，不改写原句。
- 每个注释附录包含稳定目标、标题路径、精确引语和上下文；评论附录定位整篇文章。
- 线程按注释/评论分组并保留嵌套回复。
- 审阅附录格式应兼顾人类可读、AI 理解和机器重解析；最终标签 schema 在实现前锁定并写 fixture。
- v1 下载物是单个 `.md`，保留文章包相对资源引用；它服务源码审阅和 AI 改文，不承诺离开文章包后资源自包含。完整文章包 ZIP 属于后续可选增强。
- 讨论附录不能原样拼接用户源码；必须重新经过 `discussion` profile，并由 Markdown exporter 转义/重建链接、HTML、自定义标签和围栏。

### 12.3 TXT

- 输出可读纯文本，不输出不可理解的 HTML/XML。
- 公式保留 TeX；代码保留围栏或清晰缩进；媒体/网页输出标题与 URL；组件使用文字 fallback。

### 12.4 DOCX

- 生成合法 OOXML `.docx` Blob 并直接下载。
- 保留标题、段落、列表、表格、引用、代码、图片、公式和讨论附录结构。
- 不用改扩展名的 HTML/TXT 冒充 DOCX。
- 不可信讨论不得生成外部关系、远程模板、嵌入对象、域字段或危险 URI；外链只通过受控超链接关系生成。

### 12.5 PDF

- 生成 PDF Blob 并直接下载，不调用 `window.print()`。
- 文本应尽量保持可选择；不能把整篇文章粗暴栅格化成长图。
- 中文字体、分页、孤行寡行、代码换页、表格、长链接、公式、SVG、长文档和文件体积必须专项验证。
- Canvas、HTML 和网页 renderer 必须提供快照或降级卡片；跨域 iframe 无法捕获时不得阻塞全文导出。
- PDF 依赖动态加载，并在 Web Worker 中执行（主线程生成会冻结页面并使取消失效）；失败返回节点级诊断。
- 禁止 PDF launch/action、附件、JavaScript 和未验证链接动作；导出器不得为了截图或预览从服务端抓取用户控制 URL，避免 SSRF。SVG/Mermaid 快照在进入 PDF/DOCX 前继续使用统一安全投影。

## 十三、执行位置、性能预算与失败策略

### 13.1 执行位置总则

默认在构建期完成；构建期做不到的推迟到用户真正需要它的那一刻；进入浏览器的一律按需动态加载。

| 能力 | 执行位置 | 理由 |
|---|---|---|
| Markdown/GFM/代码编译 | 构建期 | 正文在构建时定稿，客户端不承担解析成本 |
| KaTeX 公式 | 构建期渲染为 HTML | 纯 JS 可在 Node 完成；文章页不加载公式运行时 |
| Mermaid 图表 | 浏览器，视口内懒加载 | 布局测量需真实浏览器；构建期方案需无头浏览器，技术验证通过前不采用 |
| 图片响应式与格式转换 | 构建期 | 见 13.3 |
| `discussion` 解析、校验与 sanitize | 浏览器，面板打开后 | 7.2 要求每次读取重新验证，不可预编译或缓存为可信 HTML |
| Canvas / `html-embed` / `web-embed` | 浏览器，视口内懒加载 | 运行时能力，无法静态化 |
| Markdown / TXT 导出 | 浏览器，点击后动态加载；主线程即可 | 只是字符串投影与 `Blob` 下载，无重排版计算，不值得为它引入 Worker 打包链路 |
| DOCX / PDF 导出 | 浏览器 Web Worker | 主线程执行会冻结页面并使取消按钮失效 |

- 同一套 parser/Canonical IR/registry 在两个位置执行：`article` 路径在构建机器上运行，`discussion` 路径在浏览器中运行。共享实现是为了规则一致，不代表两侧成本相同。
- 文章未使用某 renderer 时不得下载其运行时。
- 未打开的讨论面板不加载解析器、公式运行时或讨论数据。
- 导出运行时及其中文字体不进入阅读首屏包。

### 13.2 性能预算

阅读路径与其他一切分账：正文首屏必须便宜；3D、讨论、导出可以重，但只在用户主动触发时付费。

| 预算项 | 上限（压缩后） | 说明 |
|---|---:|---|
| 文章页首屏 JavaScript | 200 KB | React + Next 基线约 170 KB，自有代码余量约 30 KB |
| 文章页首屏字体 | 300 KB | 首屏可见字符命中的切片总量 |
| 单张文章图片 | 300 KB | 构建期转换后实际投放的变体 |
| 讨论面板打开后追加 | 300 KB | 解析器 + sanitizer + KaTeX |
| 首页 3D（桌面、动态加载后） | 400 KB | 不计入任何首屏 |
| 导出运行时（点击后） | 不设上限 | 与阅读完全隔离；DOCX/PDF 必须 Worker 执行 + 独立字体，MD/TXT 见 13.1 |

- 数字是初值，可依实测调整，但调整必须更新本表；不接受"这次先超一点"。
- 每阶段验收必须实测并记录首屏体积，否则本表无效：用 `$env:ANALYZE='true'; pnpm build` 分析包组成，并统计 `out/` 中首屏 HTML 实际引用的脚本与字体体积。

测量口径（不写死就没法复现，也没法判定是否超标）：

- **「压缩后」= gzip 后字节数**，不是磁盘大小，也不是 bundle analyzer 的 parsed 列。
- **测量对象是中文综合验收文章的 `/blog/<slug>/`**，因为它命中的 renderer 最多，是最坏情况。
- `ANALYZE` 是**约定而非现成能力**：`next.config.ts` 需要接入 `@next/bundle-analyzer` 分支，依赖与配置改动都要单独授权。未接入前只能记录「未测」，不得用 `out/` 目录大小假装完成。
- **字体不进 `out/`**（走云字体 CDN，见 13.3），所以字体预算只能用浏览器 DevTools/HAR 量实际下载的切片，扫 `out/` 会得到 0。
- 实测超标时，优化与「更新本表」都属于产品决策，必须由人确认，不能由执行方自行改预算。

### 13.3 图片与字体

- `output: 'export'` 关闭了 Next.js 图片优化，原图会原样投放。响应式尺寸与现代格式必须由构建期图片流水线产出，`index.md` 只引用原图。
- 图片必须携带宽高，避免加载期布局抖动。
- 派生变体会成倍放大 `out/` 文件数，必须计入 20,000 文件上限校验。
- 中文字体按 `unicode-range` 切片经**云字体服务**加载（不自托管、不进 `out/`），浏览器只下载当前页面命中的分片；服务商选定见 [frontend-design.md 第二节](../conventions/frontend-design.md)。
- 不得按"站内已用字"整体裁剪字体：文章用字构建期可知，但讨论内容的字符集由访客决定，构建期不可知，整体裁剪会让讨论区出现缺字。
- 导出所需的完整中文字体与阅读用切片分开计量，只在触发导出时从 CDN 拉取。

### 13.4 讨论渲染的运行时约束

- 7.3 的单次读取 50 条 × 单条 10,000 字符意味着最坏情况一次需解析约 50 万字符；必须逐条或按可见性解析，不得一次性同步解析整页讨论。
- 讨论、注释与登录是增强能力：任何失败都不得阻塞正文渲染，UI 显示可重试状态而不是空白或错误页。
- 讨论数据来自境外服务，较高延迟与偶发失败属于预期情况而非异常；面板必须先给出骨架与可理解状态。

### 13.5 可访问性

- iframe 必须有 `title`；图片必须有 alt；视频/音频有标题，推荐字幕/转写。
- 交互组件支持键盘；装饰动画尊重 reduced motion。

### 13.6 失败策略

- 单个 renderer 崩溃由组件级错误边界隔离；页面仍显示 fallback 和关联 ID。
- 所有用户可见错误使用中文，开发诊断可附错误码和源位置。
- 导出支持取消并释放 worker、Blob URL、canvas 与字体资源；讨论读取失败时不得悄悄声称“已导出全部”，应让用户选择重试或明确降级为纯正文。

## 十四、测试与验收基线

每个 renderer 至少包含：

- 合法最小 fixture；
- 典型完整 fixture；
- 非法属性/重复 ID/缺资源 fixture；
- article/discussion profile 权限测试；
- Markdown/TXT/DOCX/PDF 投影或 fallback 测试；
- UTF-8 中文、特殊字符和长内容测试；
- 安全测试：script、事件属性、危险 URL、路径穿越、超限输入。
- 导出安全测试：Markdown 围栏/标签转义、DOCX 外部关系、PDF active action、SVG/Mermaid 二次清洗和禁止服务端抓取用户 URL。

系统级必须验证：

- 同一 fixture 的屏幕、目录、选择映射和导出语义一致；
- 评论是文章级、注释是选区级，入口不可互换；
- 跨用户编辑被拒绝，作者不能改他人文字但可删除；
- 根线程删除级联回复；
- PDF/DOCX 点击直接下载；
- `pnpm lint`、`pnpm tsc --noEmit`、`pnpm build` 通过；
- `out/` 单文件与文件数量满足 EdgeOne 限制；
- 首屏体积经实测并记录，且在 13.2 性能预算内；
- 无 U+FFFD、无损坏中文、无失效文档链接。

## 十五、阶段进入门与可后置微调

以下不是可以边实现边猜的普通待办，而是对应阶段的进入门：

- P0 开工前：批准所需依赖安装；把本节已锁定的 frontmatter、标签名、错误分级和 original source 契约写成 schema/fixture。
- iframe renderer 开工前：确认隔离源、精确 sandbox/CSP/Permissions Policy/`referrerPolicy`，并解决当前全局 `X-Frame-Options: DENY` 对站内嵌入页的影响。
- P1 discussion 开工前：把本规格资源上限和集中 allowlist 写成可执行配置；首批安全 Canvas 清单为空。
- P2 公开写入前：独立认证/邮件规格、Supabase 表结构、RLS/RPC、不变量、anchor manifest 同步、速率限制和会话撤销全部通过测试；否则不能称为可上线。
- DOCX/PDF 开工前：候选库、中文字体、分页、长文档、内存和安全投影技术验证通过后，再请求依赖安装授权。

以下细节可以在不改变领域协议的前提下后置微调：

- 评论默认排序、注释同锚点聚合和失锚认领 UI；
- 审阅附录最终可重解析标签的具体拼写，但必须先有黄金 fixture；
- 在线编辑发布回仓库与 AI “询问”接口；
- 完整文章包 ZIP、服务端超大导出等增强能力。
