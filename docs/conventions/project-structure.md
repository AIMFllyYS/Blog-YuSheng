# 项目结构与文件组织

> Created: 2026-08-14
> Updated: 2026-08-15
> Status: accepted（领域边界已定；未实现的目标文件名可随详细设计小幅调整）
>
> 本文档是项目目标目录树的权威说明。目录按领域和依赖方向组织，不要求一次性创建所有空目录；实现某项能力时再创建对应路径。

## 完整目标目录树

```text
.
├── content/                              # 内容仓库：文章是数据，不放入 src/
│   ├── posts/                            # 正式博客文章
│   │   └── <slug>/                       # slug 即公开 URL；一篇文章一个完整文件夹
│   │       ├── index.md                  # 唯一正式权威源：frontmatter + MD + 自定义标签
│   │       ├── data/                     # 图表、Canvas、问答等结构化数据
│   │       │   ├── *.json
│   │       │   └── *.csv
│   │       ├── media/                    # 文章专属图片、视频、音频、SVG、poster
│   │       │   ├── images/
│   │       │   ├── video/
│   │       │   ├── audio/
│   │       │   └── svg/
│   │       └── embeds/                   # 文章专属 HTML/站内嵌入页面及其局部资产
│   │           └── <embed-id>/
│   │               ├── index.html
│   │               └── assets/
│   ├── pages/                            # 未来独立内容源预留；不自动映射 /pages/* 路由
│   │   └── <slug>/index.md
│   ├── notes/                            # 未来 /notes/ 短随笔
│   └── works/                            # 未来 /works/ 作品内容
│
├── src/
│   ├── app/                              # App Router 路由入口；只组合，不承载业务内核
│   │   ├── layout.tsx                    # 根 layout：html/body、主题、字体
│   │   ├── page.tsx                      # 首页：桌面叙事 / 移动卡片
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── global-error.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   ├── blog/
│   │   │   ├── layout.tsx                # 博客段硬刷新首屏遮罩
│   │   │   ├── page.tsx                  # /blog/ 文章列表
│   │   │   └── [slug]/
│   │   │       ├── loading.tsx           # 书架进入文章时的书册遮罩
│   │   │       └── page.tsx              # /blog/<slug>/；generateStaticParams 全量静态化
│   │   ├── notes/                        # /notes/ 随笔；现为可替换的建设中页
│   │   ├── works/                        # /works/ 作品集；现为可替换的建设中页
│   │   ├── about/                        # 未来预留
│   │   └── _dev/                         # 隔离调试页；production 必须 notFound()
│   │
│   ├── components/
│   │   └── ui/                           # 无业务逻辑的展示/交互基座
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── tabs.tsx
│   │       └── ...
│   │
│   ├── features/                         # 跨路由或独立可迁移的业务领域
│   │   ├── doc-engine/                   # ★ 统一文档内核
│   │   │   ├── core/
│   │   │   │   ├── document-types.ts     # Canonical Document IR
│   │   │   │   ├── parse-document.ts     # 源文本 -> AST
│   │   │   │   ├── compile-document.ts   # AST -> Canonical IR
│   │   │   │   └── diagnostics.ts        # 可定位解析/校验诊断
│   │   │   ├── registry/
│   │   │   │   ├── renderer-definition.ts
│   │   │   │   ├── renderer-registry.ts
│   │   │   │   └── register-builtins.ts
│   │   │   ├── profiles/
│   │   │   │   ├── article-profile.ts    # 仓库受信任正文能力
│   │   │   │   ├── discussion-profile.ts # 不可信评论/注释安全能力
│   │   │   │   ├── editor-profile.ts     # 未来源码预览能力
│   │   │   │   └── projection-policy.ts  # 节点级导出投影能力，不是屏幕 profile
│   │   │   ├── security/
│   │   │   │   ├── sanitize-discussion.ts
│   │   │   │   ├── validate-url.ts
│   │   │   │   ├── validate-component-use.ts
│   │   │   │   └── render-limits.ts
│   │   │   ├── renderers/                 # 每个组件完整拥有 schema/屏幕/导出/测试
│   │   │   │   ├── markdown/
│   │   │   │   ├── code/
│   │   │   │   ├── katex/
│   │   │   │   ├── mermaid/
│   │   │   │   ├── image/
│   │   │   │   ├── video/
│   │   │   │   ├── audio/
│   │   │   │   ├── canvas/
│   │   │   │   ├── svg/
│   │   │   │   ├── html/
│   │   │   │   ├── web/
│   │   │   │   ├── quiz-choice/
│   │   │   │   ├── quiz-fill/
│   │   │   │   ├── text-mark/
│   │   │   │   ├── aside-note/
│   │   │   │   ├── compare-block/
│   │   │   │   ├── timeline-block/
│   │   │   │   └── inset-card/
│   │   │   ├── mark-style/               # tone/swatch/color 与 effect 共享解析
│   │   │   ├── screen/
│   │   │   │   └── document-renderer.tsx # profile 驱动的统一屏幕入口
│   │   │   ├── selection/
│   │   │   │   ├── source-map.ts          # DOM selection -> 源节点坐标
│   │   │   │   └── selectable-node.ts
│   │   │   ├── toc/
│   │   │   │   └── extract-outline.ts
│   │   │
│   │   ├── export-service/                # 组合文章与讨论；依赖 doc-engine + discussions
│   │   │   ├── export-document.ts         # Export Document IR
│   │   │   ├── assemble-export.ts
│   │   │   ├── discussion-snapshot.ts
│   │   │   ├── markdown/
│   │   │   ├── text/
│   │   │   ├── docx/
│   │   │   └── pdf/
│   │   │
│   │   ├── discussions/                   # 评论/注释共享的讨论内核
│   │   │   ├── domain/
│   │   │   │   ├── discussion-entry.ts
│   │   │   │   ├── discussion-thread.ts
│   │   │   │   ├── discussion-permissions.ts
│   │   │   │   └── auth-port.ts           # P0 假身份 / P1 真实身份共用端口
│   │   │   ├── repository/
│   │   │   │   ├── discussion-repository.ts
│   │   │   │   ├── memory-discussion-repository.ts
│   │   │   │   └── supabase-discussion-repository.ts
│   │   │   └── components/
│   │   │       ├── discussion-thread.tsx
│   │   │       ├── discussion-composer.tsx
│   │   │       ├── discussion-content.tsx # 调用 DocumentRenderer discussion profile
│   │   │       ├── discussion-entry-menu.tsx
│   │   │       └── author-badge.tsx
│   │   │
│   │   ├── comments/                      # 文章级评论，不含文本锚点
│   │   │   ├── article-comment-panel.tsx
│   │   │   ├── article-comment-list.tsx
│   │   │   └── article-comment-composer.tsx
│   │   │
│   │   ├── annotations/                   # 选区级注释
│   │   │   ├── selection/
│   │   │   │   ├── capture-selection.ts
│   │   │   │   └── selection-toolbar.tsx
│   │   │   ├── anchors/
│   │   │   │   ├── text-anchor.ts
│   │   │   │   ├── create-text-anchor.ts
│   │   │   │   └── resolve-text-anchor.ts
│   │   │   ├── highlights/
│   │   │   │   └── annotation-highlights.tsx
│   │   │   ├── annotation-panel.tsx
│   │   │   ├── annotation-list.tsx
│   │   │   └── annotation-composer.tsx
│   │   │
│   │   ├── boot/                          # 全站唯一进页遮罩：翻书 + 全屏水印
│   │   ├── reader-layout/                 # 三栏/抽屉、面板收展、分栏拉动
│   │   ├── toc/                           # 左目录树与图形骨架缩略模式
│   │   ├── blog-index/                    # /blog/ 列表页书架形态
│   │   ├── notes/                         # /notes/ 随笔入口（现为建设中页，整页可替换）
│   │   ├── works/                         # /works/ 作品集入口（现为建设中页，整页可替换）
│   │   ├── navigation/                    # 绳挂导航与阅读页顶部动作
│   │   ├── settings/                      # 主题、音效
│   │   ├── home-journey/                  # 首页叙事；不依赖 doc-engine
│   │   ├── auth-shell/                    # 后期：登录弹窗、身份接口、作者白名单
│   │   ├── article-editor/                # 后期：源码编辑、云草稿、发布
│   │   └── agent-shell/                   # 后期：选区询问与电子分身接口
│   │
│   ├── lib/
│   │   ├── supabase/                      # 客户端、生成类型、最小适配基础
│   │   ├── theme/                         # 主题 token 与切换
│   │   ├── audio/                         # 全站音效开关与统一播放
│   │   └── download/                      # 浏览器 Blob 下载等通用工具
│   │
│   └── server/
│       └── content/                       # 仅构建期运行；必须 import 'server-only'
│           ├── discover-posts.ts
│           ├── read-post.ts
│           ├── validate-frontmatter.ts
│           ├── validate-assets.ts
│           ├── create-anchor-manifest.ts
│           └── create-static-params.ts
│
├── docs/
│   ├── plans/                             # 路线图、优先级、里程碑
│   │   └── plan-blog-foundation.md        # 博客内容系统 P0–P3 工程计划
│   ├── conventions/                       # 编码、路由、结构、前端规范
│   ├── updates/                           # 版本变更
│   ├── specs/                             # 内容协议、功能/API/安全规格
│   │   ├── blog-content-engine.md         # 内容引擎、讨论、锚定与导出契约
│   │   └── auth-and-discussions.md        # P1 进入门：认证、白名单、表/RLS/RPC
│   ├── audits/                            # 性能、安全、架构审计
│   ├── ops/                               # 本地运行与 EdgeOne 运维
│   ├── issues/                            # 已知问题与技术债
│   └── designs/                           # 总体架构和交互设计决策
│       ├── architecture-overview.md       # 全站滚动架构总览
│       ├── home-journey-storyboard.md     # 首页叙事分镜
│       ├── blog-reader-design.md          # 博客页文字说明与待确认项
│       └── blog-reader-prototype.html     # 博客页 1:1 视觉与交互对标（零依赖，纯展示）
│
├── scripts/
│   ├── setup/
│   ├── build/
│   │   ├── validate-content.*             # frontmatter/标签/资源/唯一 ID
│   │   ├── transform-content-images.*     # 响应式尺寸与现代格式（静态导出无图片优化）
│   │   ├── copy-content-assets.*          # 文章资产搬运到静态产物
│   │   └── verify-static-output.*         # 25 MB/20,000 文件等限制
│   ├── deploy/
│   └── dev/
│       ├── validate-content-fixtures.*
│       └── capture-reader-journey.*
│
├── public/                                # 仅全站共享资源
│   ├── fonts/                             # 仅极小的装饰性 subset（如有）；中文正文字体走云字体服务，不放这里
│   └── sounds/                            # UI 音效，默认关闭
├── .tmp/                                  # 本地临时文件（gitignore，不入库）
├── AGENTS.md
├── edgeone.json
├── next.config.ts
├── package.json
└── pnpm-lock.yaml
```

## 分层与依赖方向

```text
src/app
  → features
      → components/ui + lib

server/content
  → content/

comments + annotations
  → discussions
      → doc-engine(screen, discussion profile)

export-service
  → doc-engine(Canonical IR + renderer projections)
  → discussions(repository contracts + normalized snapshot)
  → 不依赖阅读页 DOM
```

硬规则：

- `src/app/` 只组合页面、生成 metadata 和静态参数，不实现解析器、评论规则或导出算法。
- `doc-engine` 不依赖 `discussions`、评论/注释 UI 或仓储；只负责文档语义、屏幕渲染和节点级导出投影。
- `export-service` 是唯一同时依赖 `doc-engine` 与 `discussions` 的组合层，避免 `doc-engine ↔ discussions` 循环依赖。
- `comments` 与 `annotations` 是不同产品领域；共享能力放 `discussions`，不得用复制粘贴维持两套线程实现。
- `discussion` profile 复用正文渲染器定义，但默认权限更小；不得为评论另写一套 Markdown 渲染器。
- `server/content` 只在构建期读取仓库文件，客户端组件不得直接依赖 `fs` 或 `content/` 绝对路径。
- 导出器只消费统一 IR，不抓取当前页面 DOM，不依赖某个具体布局组件。
- 每个 renderer 自己拥有 schema、屏幕渲染、导出投影、降级和测试；不建立按输出格式复制的第二套组件目录。

## 内容与资源放置规则

### 一篇文章一个完整边界

```text
content/posts/<slug>/
├── index.md
├── data/
├── media/
└── embeds/
```

- slug 即 URL，不在 frontmatter 重复定义。
- 删除/迁移一篇文章时，以整个文章目录为边界。
- `index.md` 只放适合人读、Git diff 和 AI 编辑的内容；大型 JSON、SVG、HTML、音视频不内嵌。
- 文章相对路径只能解析到自己的目录内部；禁止 `../` 逃逸到其他文章或仓库任意位置。
- 路径校验必须对真实路径执行：拒绝盘符/UNC 绝对路径、反斜杠或编码 traversal、symlink/junction/reparse point 逃逸；realpath 后仍须位于文章包根目录。
- 所有自定义标签 ID 在文章内唯一，构建期严格校验。

### `media/` 与 `embeds/`

- 普通图片、视频、音频、SVG 放 `media/`；复杂独立 HTML 小页面放 `embeds/<embed-id>/`。
- renderer 的 `collectAssets` 只声明依赖；`server/content` 汇总并验证唯一 manifest；构建脚本只执行 manifest 中资产的复制与静态 URL 落位，不重复发现逻辑。
- 构建步骤必须把被引用资源搬运进 `out/`；HTML `embeds/` 的 CSS、JS、图片、字体等传递依赖也必须进入同一 manifest。验证真实文件类型、大小和数量，外部 URL 永不自动下载。
- `output: 'export'` 关闭了 Next.js 图片优化，原图会原样投放；响应式尺寸与现代格式由构建期图片流水线产出，`index.md` 只引用原图，manifest 记录全部派生变体。
- 派生变体成倍放大 `out/` 文件数，必须计入 20,000 文件上限校验。
- 静态产物路径必须由构建器统一生成，不允许组件自己拼接本地文件系统路径。
- 每个文件 ≤25 MB；全站产物总文件数 ≤20,000。

#### `embeds/` 的公开 URL 契约（安全门约束，不可改）

`content/posts/<slug>/embeds/<embed-id>/**` 必须落位到 **`out/embeds/<slug>/<embed-id>/**`**，即公开 URL 是 `/embeds/<slug>/<embed-id>/index.html`，**不放在 `/blog/<slug>/` 之下**。

这不是审美选择：`edgeone.json` 的 `source` 最多只能含一个 `*`，所以 `/blog/*/embeds/*` 是非法规则；若退化成 `/blog/*`，`X-Frame-Options` 的例外会连带放开整站文章页的点击劫持保护。只有单一前缀 `/embeds/*` 能写出既生效又不过宽的响应头规则。详见架构 D7「v1 安全门（方案 A）」与 [deploy-edgeone.md](../ops/deploy-edgeone.md)。

`media/` 与 `data/` 无此约束，按文章包就近落位即可。
- 第三方网页 URL 不下载进仓库，只保存经过 schema 验证的链接和降级元信息。

### `public/`

`public/` 只放全站共享的字体、音效、Logo 等。文章专属资源一律放文章目录，避免全局资源堆积和删除边界模糊。

### `content/pages/`

该目录只为未来 `/about/` 等独立内容页预留，不自动产生 `/pages/<slug>/` 或根级路由。具体页面仍须在 `src/app/<route>/page.tsx` 显式映射；实现前不创建空内容或不可达路由。

## Renderer 内部结构约定

一个成熟 renderer 的推荐结构：

```text
renderers/<renderer-name>/
├── definition.ts             # 名称、版本、allowedProfiles、安全与能力声明
├── schema.ts                 # 属性/数据 schema 与边界
├── compile.ts                # 源节点 -> Canonical IR
├── screen-renderer.tsx       # 网页显示
├── markdown-export.ts
├── text-export.ts
├── docx-export.ts
├── pdf-export.ts
├── fallback.tsx              # 错误/不支持/资源失效时的稳定降级
├── fixtures/                 # 合法、非法、边界样例
└── <renderer-name>.test.ts
```

不是每个 renderer 在第一天都必须有全部文件，但注册契约必须能表达这些能力；缺少某种导出时必须走显式 fallback，不能静默丢内容。

## 文件放置决策

仍遵守 [代码长度与文件组织规范](./code-size-and-organization.md)：

- 单路由专用代码优先 colocate；
- 跨不相关路由、可独立删除/迁移的领域才进入 `features/`；
- `features/` 不是长文件回收站；
- 长度只触发审视，职责边界才决定拆分；
- 本文目标树描述稳定领域边界，不要求为了“看起来完整”提前创建空目录。
