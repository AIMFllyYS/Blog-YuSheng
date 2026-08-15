# docs/

项目内部文档目录。

## 目录结构

| 目录 | 用途 |
|---|---|
| [`plans/`](./plans/) | 项目计划、路线图、里程碑 |
| [`conventions/`](./conventions/) | 项目规范、编码约定、架构规范 |
| [`updates/`](./updates/) | 更新日志、变更记录、版本说明 |
| [`specs/`](./specs/) | 技术规格说明（功能规格、API 规格、AI harness 规格） |
| [`audits/`](./audits/) | 审计报告（性能审计、安全审计、代码审计） |
| [`ops/`](./ops/) | 运维与操作指南（本地运行教程、部署教程、环境配置） |
| [`issues/`](./issues/) | 问题追踪与记录（已知问题、bug 记录、技术债务） |
| [`designs/`](./designs/) | 设计文档（架构设计、UI/UX 设计、技术方案） |

## 文档规范

- 文档使用 Markdown 格式
- 文件名使用 kebab-case（如 `harness-design-spec.md`）
- 新增文档和发生实质更新的核心文档应在开头注明创建日期、最后更新日期与状态；历史文档可在下次实质更新时补齐
- 技术规格文档（specs/）应包含背景、目标、方案、风险四个部分
- 设计文档（designs/）应包含问题陈述、方案对比、最终决策、决策理由

## 博客内容系统入口

- [总体架构](./designs/architecture-overview.md) — 产品边界与全局决策
- [博客页 1:1 原型](./designs/blog-reader-prototype.html) — `/blog/` 与 `/blog/<slug>/` 的视觉与交互对标，也是全站导航/通知/弹窗/动效的统一模板；实现不得另起一套外观
- [博客页设计说明](./designs/blog-reader-design.md) — 原型的文字说明、待确认项与实现归属
- [前端设计规范](./conventions/frontend-design.md) — token、阻尼动效语言、全站共用外壳清单
- [完整目标目录树](./conventions/project-structure.md) — 模块、文件和依赖方向
- [内容引擎功能规格](./specs/blog-content-engine.md) — 内容协议、注册表、安全、评论/注释与导出契约
- [P0–P3 工程计划](./plans/plan-blog-foundation.md) — 实施顺序与阶段验收

## 状态语义

- `draft`：仍在探索，不得作为实现授权。
- `accepted baseline`：已拍板的领域原则和契约可以实施；文中明确标出的阶段进入门仍须先满足。
- `accepted roadmap`：阶段顺序和边界已接受，不代表依赖安装、配置修改、公开写入或部署已获授权。
- 目录规范标记 `accepted` 表示领域边界稳定；树中的未来文件名不代表对应详细安全设计已经完成。

当总览与专项规格状态不同，以更具体文档中的已决策条款为准；任何“进入门/待专项设计”都不能被较高层的 accepted 状态绕过。
