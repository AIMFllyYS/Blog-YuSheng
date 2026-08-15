# docs/designs/

设计文档。

## 用途

存放架构设计和技术方案文档，包括：
- 系统架构设计（整体架构、模块划分、数据流）
- UI/UX 设计（页面布局、交互设计、组件设计）
- 技术方案（技术选型对比、方案决策记录）

## 现有文档

- [architecture-overview.md](./architecture-overview.md) — 全站架构总览与决策记录（内容协议、文档引擎、评论/注释、安全渲染、导出、首页；滚动更新）
- [home-journey-storyboard.md](./home-journey-storyboard.md) — 首页 3D 叙事分镜节拍表（四章 + 尾声，draft）
- [blog-reader-prototype.html](./blog-reader-prototype.html) — `/blog/` 与 `/blog/<slug>/` 的 **1:1 视觉与交互对标**（浏览器直接打开，零依赖，不接入任何真实功能）。实现这两页时以本文件为准，不得另起一套外观。
- [blog-reader-design.md](./blog-reader-design.md) — 上述原型的文字说明、待确认项与实现归属（双层滚动、绳挂导航、目录双模式、划词与注释、右侧工作区、整幅页尾评论区；draft）

## 文档结构模板

```markdown
# [Design Title]

> Created: YYYY-MM-DD
> Updated: YYYY-MM-DD
> Status: draft | review | accepted | deprecated

## 问题陈述
[要解决什么问题]

## 方案对比
[列出多个候选方案及其优劣]

## 最终决策
[选择了哪个方案]

## 决策理由
[为什么选择这个方案]
```
