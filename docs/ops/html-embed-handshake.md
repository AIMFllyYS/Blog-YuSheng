# 本地 HTML embed 握手与故障排查

`<html-embed>` 的本地页面运行在文章阅读页创建的 sandbox iframe 中。宿主会给 iframe URL 追加一次性的 `nonce`，页面必须用这个 nonce 回报 `ready`，宿主才会把预览标记为已加载；随后用 `resize` 回报内容高度。缺少握手时，页面可能先被浏览器绘制出来，约 4 秒后仍会被宿主判定为未完成安全握手并切换到 `DOC-ASSET-004` 降级卡。

这不是对 HTML 内容的安全评级，也不是“自己的 HTML 不可信”。它是宿主确认消息确实来自当前 iframe 的固定通信协议。直接打开 `/embeds/<slug>/<id>/index.html` 时没有 nonce，页面仍应正常显示，只是不向博客宿主回报状态。

## 发布硬规则

所有 `content/posts/**/embeds/**/index.html` 都必须在 `</body>` 前包含下面这段协议桥接代码（可以保留自己的 CSS、业务脚本和交互）：

```html
<!-- blog-yusheng:html-embed-handshake v1 -->
<script>
  (() => {
    const nonce = new URLSearchParams(location.hash.slice(1)).get('nonce')
    if (!nonce || window.parent === window) return
    window.parent.postMessage({ nonce, message: { type: 'ready' } }, '*')
    const reportHeight = () => {
      window.parent.postMessage(
        { type: 'resize', height: document.documentElement.scrollHeight },
        '*',
      )
    }
    requestAnimationFrame(reportHeight)
    new ResizeObserver(reportHeight).observe(document.documentElement)
  })()
</script>
```

注意：

- `ready` 必须是带 nonce 的 envelope；不要只发送 `{ type: 'ready' }`。
- `resize` 是普通消息，`height` 必须是正数；`ResizeObserver` 用来覆盖异步渲染、搜索结果和展开/收起造成的高度变化。
- `'*'` 是必要的，因为 sandbox iframe 没有可供宿主预先写死的稳定 origin；宿主仍会同时校验 `event.source` 与 nonce。
- 不要把 nonce 写死，不要改成从 query 参数读取，也不要给 iframe 增加 `allow-same-origin` 来绕过协议。
- `window.parent === window` 的判断让 HTML 作为独立页面打开时不产生无意义的消息；文章内嵌时宿主会自动追加 nonce。
- 一个 embed 可以同时有 `styles.css`、`data.js`、`app.js` 等资源；入口始终是 `embeds/<id>/index.html`，宿主不会把脚本文件误当 iframe 页面。

## 仓库的自动保护

正式项目内容在构建期会检查每一个本地 HTML embed 是否具备：

1. 从 `location.hash` 读取 `nonce`；
2. 发送带 nonce 的 `ready` 握手；
3. 发送 `resize` 高度消息。

检查失败会以 `ASSET_HTML_HANDSHAKE_MISSING` 终止构建，不会把一个几秒后必然降级的页面发布到 `main` 或 EdgeOne。这个检查只针对项目正式内容根目录 `content/posts/`；单元测试使用的临时文章根目录可以按测试需要构造最小 fixture。

新增或替换 HTML 后，至少运行：

```powershell
pnpm test -- tests/unit/html-embed-protocol.test.ts
pnpm build
```

浏览器验收时打开对应的 `/blog/<slug>/`：预览应持续显示，`data-embed-ready` 最终为 `true`，内容高度变化不会被裁切；右上角“打开”打开独立页面时也应保持原 HTML 的全部交互。

## 现有资源修复范围

本规则落地时已为仓库中缺少协议桥接的自有 HTML 补齐握手：Grok CLI 周账、组件库与 AI 编程、色彩手册、版本号观察，以及较早的「十月九条」和「中二自我介绍」卡片。已有正确握手的其它文章不重复注入脚本。

如果仍看到“这个 HTML 嵌入未能完成安全握手”：

1. 查看 HTML 是否真的从 URL hash 读取 `nonce`，而不是只在业务代码里声明同名变量；
2. 确认 `ready` 消息在业务脚本抛错之前执行，必要时把协议桥接放到 `</body>` 前最后一个脚本位置；
3. 确认文章使用的是 `./embeds/<id>/index.html`，没有把预览指向另一个入口；
4. 重新运行 `pnpm build`，让构建期检查给出具体文章和组件 ID；
5. 查看浏览器控制台是否有 HTML 自身的 JavaScript 异常。宿主的 fallback 只表示握手未完成，不代表正文 Markdown 失败。

不要通过删除超时、自动信任 iframe 或放宽 sandbox 来“修复”这个问题。协议桥接是最小改动，宿主的 source + nonce 校验仍然保留。
