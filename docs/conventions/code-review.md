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
- 检查文章相对资源路径是否限制在当前文章目录内，禁止路径穿越和任意动态模块路径
- 检查未知标签、非法属性、资源缺失是否输出可定位诊断并安全降级，而不是使整篇文章崩溃

## 评论、注释与不可信内容

- 检查评论是否只表示文章级线程、注释是否只表示选区级线程；不得恢复“划词后选择评论/注释”的旧交互
- 检查评论/注释是否统一走 `discussion` profile，而不是直接使用完整 `article` 权限
- 检查不可信内容是否在写入前验证、读取渲染时再次验证，并在最后一个不安全转换之后 sanitize
- 检查是否禁用原始 HTML、任意 JS/CSS、危险 URL、任意 iframe 和用户控制的动态 import
- 检查 KaTeX/Mermaid/Canvas 等是否有源长度、实例数量、递归深度或其他资源边界
- 检查“作者”徽标和文章编辑权是否由认证系统的已验证邮箱派生，不接受客户端自报身份
- 检查用户只能编辑自己的讨论内容；作者可删除任意内容但不能修改他人文字；根线程硬删除必须级联回复

## 导出一致性

- 检查 Markdown/TXT/DOCX/PDF 是否消费同一 Export Document IR，禁止抓取当前页面 DOM 作为权威导出源
- 检查 Markdown 纯正文是否保留原始 frontmatter、Markdown、公式、Mermaid 和自定义标签
- 检查注释/评论是否以可定位审阅附录导出，不得插入原句内部破坏列表、表格、代码或公式
- 检查 PDF 是否直接生成文件下载，不得调用 `window.print()` 或系统打印对话框
- 检查 Canvas、SVG、HTML、网页、音视频和问答题是否都有明确静态投影或显式 fallback，禁止静默丢内容
- 检查导出依赖是否动态加载，并验证中文字体、分页、长文档、包体积和资源失败场景

## 中文与文档质量

- 检查新增/修改文本为严格 UTF-8，扫描 U+FFFD，禁止损坏中文
- 检查文档内部相对链接有效、标题与索引一致、Accepted/Draft 状态没有互相矛盾
