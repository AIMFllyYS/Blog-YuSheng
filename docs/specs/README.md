# docs/specs/

技术规格说明。

## 用途

存放功能和技术规格文档，包括：
- 功能规格（用户故事、验收标准）
- API 规格（接口定义、请求/响应格式）
- 技术方案规格

## 现有文档

- [blog-content-engine.md](./blog-content-engine.md) — 博客内容协议、Canonical IR、renderer registry/profile、评论与注释、划词锚定、安全富文本、Markdown/TXT/DOCX/PDF 导出规格与执行位置/性能预算
- [auth-and-discussions.md](./auth-and-discussions.md) — P1 进入门：弹窗邮箱登录、作者白名单、本地 Docker 与 Supabase 兼容的表/RLS/RPC、anchor manifest 受信校验、限流与错误码（DOCX/PDF 不在本文）

## 文档结构模板

```markdown
# [Spec Name]

> Created: YYYY-MM-DD
> Updated: YYYY-MM-DD
> Status: draft | review | accepted baseline | deprecated

## 背景
[为什么需要这个规格]

## 目标
[要达成什么]

## 方案
[具体技术方案]

## 风险
[潜在风险与应对]
```
