# blog-yusheng

> 羽升的个人博客

## 项目简介

羽升的个人博客与电子分身项目。记录 AI 领域成长轨迹、沉淀方法论、构建带有权限系统的个人内容空间。从占位启航，逐步生长为完整的电子分身。

### 核心能力

- **Next.js App Router 架构**
- **EdgeOne Pages SSG 部署**
- **Tailwind 样式**
- **Markdown 正式内容仓库（规划中）**
- **可注册文档渲染内核（规划中）**
- **文章评论与划词注释（规划中）**
- **Markdown / TXT / DOCX / PDF 导出（规划中）**
- **首页叙事与阅读三栏（规划中）**

## 技术栈

| 类别 | 技术 | 版本 |
|---|---|---|
| 框架 | Next.js (App Router) | ≥16.2.0 |
| UI 库 | React | ≥19.2 |
| 语言 | TypeScript | strict mode |
| 包管理 | pnpm | — |
| 样式 | Tailwind CSS | — |
| 运行时 | Node.js | 22.11.0 |
| 部署 | 腾讯云 EdgeOne Pages | SSG 静态导出 |

## 快速开始

### 环境要求

- Node.js 22.11.0
- pnpm

### 安装与运行

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:9981](http://localhost:9981) 查看运行效果（端口以 `package.json` 的 `dev` 脚本为准）。

### 构建

```bash
pnpm build
```

构建产物输出到 `out/` 目录。

## 项目结构

```
.
├── src/                        # 源代码
│   ├── app/                    # 路由层
│   ├── components/ui/          # 纯展示组件
│   ├── features/               # 业务功能模块（doc-engine/discussions 等）
│   ├── lib/                    # 工具函数
│   └── server/                 # server-only 代码
├── content/                    # 正式文章、文章数据与专属媒体（目标结构）
├── docs/                       # 项目内部文档
│   ├── plans/                  # 项目计划、路线图
│   ├── conventions/            # 编码规范、架构规范
│   ├── updates/                # 更新日志
│   ├── specs/                  # 技术规格
│   ├── audits/                 # 审计报告
│   ├── ops/                    # 运维指南
│   ├── issues/                 # 问题追踪
│   └── designs/                # 设计文档
├── scripts/                    # 辅助脚本
│   ├── setup/                  # 环境初始化
│   ├── build/                  # 构建辅助
│   ├── deploy/                 # 部署脚本
│   └── dev/                    # 开发辅助
├── public/                     # 静态资源
├── AGENTS.md                   # AI 编码代理操作策略
├── edgeone.json                # EdgeOne 部署配置
└── next.config.ts              # Next.js 配置
```

完整目标目录树见 [docs/conventions/project-structure.md](./docs/conventions/project-structure.md)；高频操作规则见 [AGENTS.md](./AGENTS.md)。

## 部署

项目部署到腾讯云 EdgeOne Pages（SSG 静态导出模式）。

```bash
# 构建并部署
pnpm build
edgeone pages deploy
```

部署指南详见 [docs/ops/](./docs/ops/)。

## 文档

- [AGENTS.md](./AGENTS.md) — AI 编码代理操作策略
- [docs/designs/architecture-overview.md](./docs/designs/architecture-overview.md) — 博客总体架构与产品边界
- [docs/designs/blog-reader-prototype.html](./docs/designs/blog-reader-prototype.html) — 博客列表页/阅读页 **1:1 视觉与交互对标**（浏览器直接打开；实现不得另起一套外观）
- [docs/designs/blog-reader-design.md](./docs/designs/blog-reader-design.md) — 上述原型的文字说明与待确认项
- [docs/conventions/project-structure.md](./docs/conventions/project-structure.md) — 完整目标目录树
- [docs/specs/blog-content-engine.md](./docs/specs/blog-content-engine.md) — 内容引擎与公开讨论功能规格
- [docs/plans/plan-blog-foundation.md](./docs/plans/plan-blog-foundation.md) — P0–P3 工程计划
- [docs/](./docs/) — 全部项目内部文档
- [scripts/](./scripts/) — 辅助脚本

## License

MIT
