# 项目结构与文件组织

> 本文档是 `AGENTS.md` 中 "Project Structure" 的完整版。
> 文件放置的详细规则（colocation 原则、`src/features/` 提升条件）见 [code-size-and-organization.md](./code-size-and-organization.md)。

## 完整目录结构（目标结构）

> 本结构已合并博客项目的架构设计（见 [docs/designs/architecture-overview.md](../designs/architecture-overview.md)）。
> 路由细则见 [routing.md](./routing.md)，设计规范见 [frontend-design.md](./frontend-design.md)。

```
.
├── content/                    # ★ 文章内容仓库（权威 MD 文件，与代码分离）
│   ├── posts/                  # 正式文章（构建时打进静态站）
│   │   └── <slug>/             # 一篇文章一个文件夹（slug 即 URL，文与资产共居）
│   │       ├── index.md        # 正文：frontmatter + MD + 自定义标签
│   │       ├── data/           # 该文章板块的大数据（图表 JSON 等）
│   │       └── media/          # 该文章专属图片/视频（单文件 <25MB）
│   └── pages/                  # 独立页面内容（关于我等，同走 doc-engine 渲染）
├── src/                        # 源代码
│   ├── app/                    # 路由层：只放路由文件，不放业务逻辑
│   │   ├── layout.tsx          # 根 layout（必须含 <html> <body>；主题 data-theme、字体）
│   │   ├── page.tsx            # 首页 /（桌面 3D 叙事 / 移动端卡片入口）
│   │   ├── loading.tsx         # 全局 loading skeleton
│   │   ├── error.tsx           # 全局 error boundary（必须 'use client'）
│   │   ├── not-found.tsx       # 全局 404
│   │   ├── global-error.tsx    # 根 layout 级 error boundary
│   │   ├── globals.css         # 全局样式（主题 token 定义入口）
│   │   ├── blog/
│   │   │   ├── page.tsx        # /blog/ 文章列表（书架风）
│   │   │   └── [slug]/page.tsx # /blog/<slug>/ 阅读页（generateStaticParams 全量静态化）
│   │   └── _dev/               # 开发调试页面（不暴露给用户，production 返回 404）
│   ├── components/
│   │   └── ui/                 # 纯展示组件（Radix + Tailwind 自绘：Button, Tabs, Dialog 等）
│   ├── features/               # 业务功能模块（按领域聚合）
│   │   ├── doc-engine/         # ★ 统一文档内核（registry/renderers/pipeline/exporter/toc）
│   │   ├── home-journey/       # 首页 3D 滚动叙事 + 移动端卡片入口
│   │   ├── navigation/         # 绳挂卷轴导航（首页 + 阅读页顶部渐隐导航共用）
│   │   ├── toc/                # 左侧目录（树模式 + React Flow 图形模式）
│   │   ├── comments/           # 画词评论（选区捕获、锚定、面板、Supabase 适配层）
│   │   ├── agent-shell/        # 右侧智能体外壳
│   │   ├── reader-layout/      # 阅读页三栏布局（悬浮球收展、分栏拉动）
│   │   └── settings/           # 设置面板（主题、音效）
│   │   # 每个 feature 内部结构参照：
│   │   #   queries.ts / schemas.ts / types.ts / components/
│   ├── lib/                    # 工具函数、通用 hooks
│   │   ├── supabase/           # Supabase 浏览器客户端、表类型定义
│   │   ├── audio/              # 音效管理（统一播放 + 全局开关）
│   │   └── theme/              # 主题 tokens 定义与切换逻辑
│   └── server/                 # server-only 代码（import 'server-only'）
│       └── content/            # 构建时读取 content/（fs 扫描、frontmatter 解析，仅 SSG 构建期执行）
├── docs/                       # 项目内部文档
│   ├── plans/                  # 项目计划、路线图、里程碑
│   ├── conventions/            # 项目规范、编码约定、架构规范
│   ├── updates/                # 更新日志、变更记录
│   ├── specs/                  # 技术规格（功能/API/AI harness 规格）
│   ├── audits/                 # 审计报告（性能/安全/代码）
│   ├── ops/                    # 运维指南（本地运行/部署教程）
│   ├── issues/                 # 问题追踪与记录
│   └── designs/                # 设计文档（架构/UI/技术方案）
├── scripts/                    # 辅助脚本
│   ├── setup/                  # 环境初始化、依赖安装、配置生成
│   ├── build/                  # 构建辅助、产物检查、bundle 分析
│   ├── deploy/                 # EdgeOne 部署、环境变量同步
│   └── dev/                    # 开发辅助、mock 数据、调试脚本
├── public/                     # 静态公共资源（不放 >25MB 文件）
├── AGENTS.md                   # AI 编码代理操作策略
├── edgeone.json                # EdgeOne 部署配置
├── next.config.ts              # Next.js 配置
└── package.json
```

## 分层规则

- `src/app/` 只放路由入口文件，业务逻辑下沉到 `src/features/`
- `src/components/ui/` 只放无业务逻辑的纯 UI 组件
- 单个路由专用文件（actions/schemas）可 colocate 在路由目录内
- 跨路由共享的逻辑必须提升到 `src/features/`
- `docs/` 存放项目内部文档，每个子目录有 README.md 说明用途
- `scripts/` 存放辅助脚本，按 setup/build/deploy/dev 分类
- `src/app/_dev/` 是隔离调试区：调试/原型代码放此处，不放入正式路由

## 内容与资源的放置规则

- **`content/` 与 `src/` 分离**：文章是"数据"不是"代码"——写文章不碰 `src/`，改代码不碰 `content/`，内容可整体备份/迁移；
  且避免 lint/tsc/打包器扫描内容文件拖慢工具链、避免代码意外引用内容
- **EdgeOne 部署兼容性已验证**（见 [architecture-overview.md D16](../designs/architecture-overview.md)）：
  EdgeOne 构建时完整拉取仓库并在根目录执行构建，根目录 `content/` 构建期完全可读；部署只上传 `out/`，`content/` 原始文件不暴露到线上
- **一篇文章一个文件夹**：正文、数据、媒体共居；删除一篇文章 = 删一个文件夹
- **媒体搬运工序（实现期硬性要求）**：`content/<slug>/media/` 内的图片/视频必须由构建步骤复制进 `out/` 产物，否则线上访问不到；
  搬运后的产物路径规则在实现期定义，媒体文件计入 EdgeOne 单文件 ≤25MB / 总文件数 ≤20,000 限制
- **`public/` 只放全站共享资源**（`fonts/` 字体、`sounds/` UI 音效、Logo 等）；文章专属媒体放文章自己的 `media/`
- 预留板块（`/notes/` 短随笔、`/works/` 作品集、`/about/` 关于我）落地时，内容目录采用 `content/<板块名>/` 平行扩展，路由规则见 [routing.md](./routing.md)

## 文件放置决策

详见 [code-size-and-organization.md](./code-size-and-organization.md) 的"文件放置决策树"和 `src/features/` 提升条件。
