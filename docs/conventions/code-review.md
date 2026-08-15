# Code Review 检查清单

> 本文档是 `AGENTS.md` 中 "When Reviewing Code" 的完整版。
> AI 编码代理在进行 code review 或自我审查时按本清单逐项检查。

## 文件组织与职责

- 检查文件/函数是否过长且未按职责拆分（关注职责混杂与自然接缝，而非行数本身）
- 检查文件放置是否符合 colocation 原则：单路由专用代码是否被错误地提升到 `src/features/`（应留在路由内）；跨路由领域模块是否还散落在各路由里（应提升到 `src/features/`）

## Next.js 16 合规

- 检查是否有 `'use client'` 被过度使用（应只在叶子组件）
- 检查 `params` / `searchParams` 是否正确 `await`
- 检查是否有 `middleware.ts` 残留（应为 `proxy.ts`）
- 检查 `next.config.ts` 是否包含 `output: 'export'` + `images.unoptimized` + `trailingSlash`

## EdgeOne 部署合规

- 检查是否有大文件被放入 `public/`
- 检查 `edgeone.json` 的 `outputDirectory` 是否为 `"out"`
- 检查 `edgeone.json` 的 `buildCommand` 是否为 `pnpm run build`（禁止裸命令 `next build`）
- 检查 `edgeone.json` 的 `cloudFunctions` 是否用新字段格式（`maxDuration` 顶层 + `regions.mainland`）
- 检查是否有 `rewrites` / `redirects` 写在 `next.config.ts` 中（应移到 `edgeone.json`）

## _dev/ 隔离

- 检查 `src/app/_dev/` 页面是否有 `NODE_ENV === 'production'` 守卫
- 检查是否有正式代码引用了 `src/app/_dev/` 中的内容（应单向引用）

## 文档引擎与内容边界

- 检查正式文章是否仍以 `content/posts/<slug>/index.md` 为唯一权威源，运行时评论/注释不得写回正本
- 检查 Markdown、KaTeX、Mermaid、自定义标签是否汇入同一 Canonical Document IR，禁止屏幕/评论/导出各自重写解析器
- 检查每个自定义组件是否声明 schema、稳定 ID、允许 profile、失败降级、选择能力和各格式导出策略
- 检查文章相对资源的 realpath 是否仍在文章包内，拒绝盘符/UNC、编码 traversal、symlink/junction/reparse point 逃逸和任意动态模块路径
- 检查未知标签、非法属性、资源缺失是否输出可定位诊断并安全降级，而不是使整篇文章崩溃

## 评论、注释与不可信内容

- 检查评论是否只表示文章级线程、注释是否只表示选区级线程；不得恢复“划词后选择评论/注释”的旧交互
- 检查评论/注释是否统一走 `discussion` profile，而不是直接使用完整 `article` 权限
- 检查不可信内容是否在写入前验证、读取渲染时再次验证，并在最后一个不安全转换之后 sanitize
- 检查是否禁用原始 HTML、任意 JS/CSS、危险 URL、任意 iframe 和用户控制的动态 import
- 检查 KaTeX/Mermaid/Canvas 等是否有源长度、实例数量、递归深度或其他资源边界
- 检查“作者”徽标和文章编辑权是否由认证系统的已验证邮箱派生，不接受客户端自报身份
- 检查用户只能编辑自己的讨论内容；作者可删除任意内容但不能修改他人文字；根线程硬删除必须级联回复
- 检查 `authorId`/`createdAt` 和线程结构列是否由受信边界生成且更新不可变；parent 必须同 thread、无环、不过深，comment/annotation 的 anchor 不变量由 RLS/RPC/schema 同时约束
- 检查注释写入是否通过受信 anchor manifest 校验文章版本、块 ID、UTF-16 offset 和 exact，而不是接受客户端自证

## 导出一致性

- 检查 Markdown/TXT/DOCX/PDF 是否消费同一 Export Document IR，禁止抓取当前页面 DOM 作为权威导出源
- 检查 Markdown 纯正文是否保留原始 frontmatter、Markdown、公式、Mermaid 和自定义标签
- 检查注释/评论是否以可定位审阅附录导出，不得插入原句内部破坏列表、表格、代码或公式
- 检查 PDF 是否直接生成文件下载，不得调用 `window.print()` 或系统打印对话框
- 检查 Canvas、SVG、HTML、网页、音视频和问答题是否都有明确静态投影或显式 fallback，禁止静默丢内容
- 检查导出依赖是否动态加载，并验证中文字体、分页、长文档、包体积和资源失败场景
- 检查不可信讨论是否重新经过 `discussion` profile 和目标格式编码；Markdown 不可原样拼接用户标签/围栏，DOCX/PDF 禁止 active content、危险 URI 与外部对象
- 检查导出器是否禁止服务端抓取用户控制 URL，是否使用快照时间/游标/总量上限，并在失败或超限时明确提示而非声称完整导出

## 执行位置与性能预算

- 检查能在构建期完成的工作是否被错误地留给浏览器（公式渲染、图片尺寸/格式转换必须在构建期）
- 检查 Mermaid、Canvas、HTML/网页嵌入、讨论解析器、导出运行时是否按需或视口内动态加载，未使用时不进首屏包
- 检查讨论面板未打开时是否零加载（不拉解析器、公式运行时和数据）
- 检查文章图片是否经构建期流水线产出响应式变体并携带宽高，派生变体是否计入 20,000 文件上限
- 检查中文字体是否按 `unicode-range` 切片，而非按"站内已用字"整体裁剪；导出字体是否与阅读切片分开加载
- 检查是否超出 [规格 13.2 性能预算](../specs/blog-content-engine.md#132-性能预算)；阶段验收是否实测并记录了首屏体积
- 检查 PDF/DOCX 导出是否在 Web Worker 中执行且可真正取消
- 检查讨论/注释/登录失败是否阻塞正文渲染（不得阻塞，应显示可重试状态）

## 博客页视觉与交互

- 检查 `/blog/` 与 `/blog/<slug>/` 的布局、交互与视觉是否 **1:1 对标** [blog-reader-prototype.html](../designs/blog-reader-prototype.html)，不得另起一套外观或自行简化骨架
- 检查颜色、字体、动效、z-index 是否仍走 [frontend-design.md](./frontend-design.md) 的语义 token，禁止硬编码一套与原型无关的配色
- 检查导航命中区、双层滚动、右栏收起为悬浮球、整幅页尾评论区等已定型交互是否被改回旧口径

## 中文与文档质量

- 检查新增/修改文本为严格 UTF-8，扫描 U+FFFD，禁止损坏中文
- 检查文档内部相对链接有效、标题与索引一致、Accepted/Draft 状态没有互相矛盾
