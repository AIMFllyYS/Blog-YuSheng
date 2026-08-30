# docs/ops/

运维与操作指南。

## 用途

存放部署和运行相关的操作教程，包括：
- 本地运行教程（环境搭建、开发服务器启动、调试配置）
- 线上部署教程（EdgeOne Pages 部署、环境变量配置、域名绑定）
- 环境配置指南（Node 版本管理、pnpm 配置、IDE 设置）
- 故障排查指南（常见问题与解决方案）

## 现有文档

- [write-blog.md](./write-blog.md) — 作者写作指南与新增博客 SOP（先选**大方向**，再建**小博客**包；**章节**按发布时间排。含 `content/sections.yml` 现有方向、「其他」与散页的区别、frontmatter、正文语法、素材目录、预览与发布）
- [article-design-language.md](./article-design-language.md) — 正文自定义组件与颜色速查（`text-mark`、板块标签、`tone`/`swatch`/`color`、何时才用 html-embed）
- [post-tags.md](./post-tags.md) — 文章标签备忘（只记录常用词，不参与构建或校验）
- [html-embed-handshake.md](./html-embed-handshake.md) — 本地 HTML embed 的 nonce 握手、自动构建保护与故障排查
- [deploy-edgeone.md](./deploy-edgeone.md) — EdgeOne Pages 部署配置规范

## 文件命名

- `write-blog.md` — 博客写作指南
- `local-setup.md` — 本地环境搭建
- `deploy-edgeone.md` — EdgeOne 部署指南
- `env-config.md` — 环境变量配置
- `troubleshooting.md` — 故障排查
