# 项目结构与文件组织

> 本文档是 `AGENTS.md` 中 "Project Structure" 的完整版。
> 文件放置的详细规则（colocation 原则、`src/features/` 提升条件）见 [code-size-and-organization.md](./code-size-and-organization.md)。

## 完整目录结构

```
.
├── src/                        # 源代码
│   ├── app/                    # 路由层：只放路由文件，不放业务逻辑
│   │   ├── layout.tsx          # 根 layout（必须含 <html> <body>）
│   │   ├── page.tsx            # 首页 /
│   │   ├── loading.tsx         # 全局 loading skeleton
│   │   ├── error.tsx           # 全局 error boundary（必须 'use client'）
│   │   ├── not-found.tsx       # 全局 404
│   │   ├── global-error.tsx    # 根 layout 级 error boundary
│   │   ├── globals.css         # 全局样式
│   │   ├── (marketing)/        # 路由组：公共页面（不影响 URL）
│   │   │   ├── layout.tsx
│   │   │   └── about/page.tsx  # /about
│   │   ├── (app)/              # 路由组：登录后应用
│   │   │   ├── layout.tsx      # auth guard + app shell
│   │   │   └── dashboard/page.tsx
│   │   ├── _dev/              # 开发调试页面（不暴露给用户，production 返回 404）
│   │   ├── api/                # Route Handlers
│   │   │   └── ping/route.ts
│   │   └── [...slug]/page.tsx  # catch-all 动态路由
│   ├── components/
│   │   └── ui/                 # 纯展示组件（Button, Card, Input 等）
│   ├── features/               # 业务功能模块（按领域聚合）
│   │   └── video/
│   │       ├── actions.ts      # Server Actions（写操作）
│   │       ├── queries.ts      # 数据读取（只读）
│   │       ├── schemas.ts      # Zod 校验 schema
│   │       ├── types.ts        # TS 类型
│   │       └── components/     # 该功能的 UI 组件
│   ├── lib/                    # 工具函数、通用 hooks
│   └── server/                 # server-only 代码（import 'server-only'）
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

## 文件放置决策

详见 [code-size-and-organization.md](./code-size-and-organization.md) 的"文件放置决策树"和 `src/features/` 提升条件。
