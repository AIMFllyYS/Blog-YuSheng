# 代码风格规范

> 本文档是 `AGENTS.md` 中 "When Writing Code" 的完整版。
> 代码长度与文件组织规则见 [code-size-and-organization.md](./code-size-and-organization.md)。
> Next.js 16 特有模式与陷阱见 [nextjs-16-patterns.md](./nextjs-16-patterns.md)。

## 组件与渲染

- 默认 Server Component，仅需要交互/浏览器 API 时加 `'use client'`
- `'use client'` 尽量放在叶子组件，不要放在页面级
- 使用 `next/dynamic` 做客户端组件懒加载
- 命名导出优先；page/layout 除外（Next.js 要求默认导出）

## TypeScript

- strict mode，禁止 `any`，用 `unknown` + 类型收窄

## 样式

- Tailwind CSS for styling，不使用 CSS Modules（除非覆盖第三方组件）
- 使用 `clsx` 或 `cn()` 处理条件 className
- `/blog/` 与 `/blog/<slug>/` 的布局与交互 **1:1 对标** [blog-reader-prototype.html](../designs/blog-reader-prototype.html)；颜色/字体/动效走 [frontend-design.md](./frontend-design.md) 的 token，禁止另起一套外观

## 测试与质量

- 新功能必须写测试
- 改动后运行 `pnpm lint` 确认无错误

## _dev/ 调试区规则

- 调试/原型代码放在 `src/app/_dev/` 下，不放入正式路由
- 每个 `_dev/` 页面顶部必须有 production 环境守卫：`if (process.env.NODE_ENV === 'production') notFound()`
- `_dev/` 可以引用正式组件，但正式代码不得引用 `_dev/` 中的任何内容（单向引用）
- 调试完成后，将代码迁移到正式路由，清理 `_dev/` 中的调试页面
