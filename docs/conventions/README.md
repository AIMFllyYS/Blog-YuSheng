# docs/conventions/

项目规范、编码约定、架构规范。

## 用途

存放项目内部的规范文档，包括：
- 编码规范（TypeScript、React、CSS 命名等）
- 架构规范（目录结构、模块划分、依赖方向）
- Git 规范（分支策略、Commit 消息格式）
- API 设计规范
- 文档编写规范

## 现有文档

- [code-size-and-organization.md](./code-size-and-organization.md) — 代码长度与文件组织规范（长度阈值、colocation 放置原则、拆分判断方法）
- [project-structure.md](./project-structure.md) — 完整目录结构与分层规则（含 content/ 内容仓库与 features 模块划分）
- [routing.md](./routing.md) — 路由规范（页面地图、URL 规则、导航映射、分享规范）
- [frontend-design.md](./frontend-design.md) — 前端设计规范（主题 token、字体、动效、z-index、响应式、音效）
- [ports-and-env.md](./ports-and-env.md) — 端口与本地环境规范
- [nextjs-16-patterns.md](./nextjs-16-patterns.md) — Next.js 16.2+ 关键模式与陷阱（proxy.ts、async APIs、Turbopack、SSG 配置等）
- [code-style.md](./code-style.md) — 代码风格规范（Server Component、use client、TypeScript、Tailwind、_dev/ 规则）
- [code-review.md](./code-review.md) — Code review 检查清单

## 与 AGENTS.md 的关系

`AGENTS.md` 是面向 AI 编码代理的操作策略文件，而本目录存放的是面向人类开发者的完整规范文档。AGENTS.md 中的规则应与本目录下的规范保持一致，但本目录可以包含更详细的解释和背景说明。
