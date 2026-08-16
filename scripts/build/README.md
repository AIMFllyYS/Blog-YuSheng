# scripts/build/

构建辅助脚本。

## 用途

存放构建相关的辅助脚本，包括：
- 构建产物检查（文件大小、文件数量）
- Bundle 分析
- 构建前/后处理
- EdgeOne 构建输出验证

`pnpm build` 完成 Next.js 静态导出后会自动执行
`run-content-assets.test.ts`：它通过独立 Vitest 配置加载 server-only 的
manifest API，只复制 manifest 中的文章资源，最后校验 25 MB / 20,000
文件限制。这里的 Vitest 只是现有 TypeScript 执行入口，不承担资源发现。
