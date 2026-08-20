# PDF / DOCX 中文长文档技术验证 — 2026-08

> Status: probe complete；**未**把任何候选库写入主仓 `package.json` / `pnpm-lock.yaml`。
> 依据：架构 D9 / D12 / D20；内容引擎 12.4–12.5、13.1。
> Probe 工程：`.tmp/pdf-docx-probe/`（独立 `pnpm`，gitignore）。产物在 `.tmp/pdf-docx-probe/out/`。

## 结论（先写选型，不写「都可以」）

| 格式 | 锁定建议 | 不要选 |
|---|---|---|
| **DOCX** | **`docx`（本轮 9.7.1）** | 把 HTML/TXT 改扩展名；在 Worker 里走 `window`/`document` |
| **PDF** | **`pdf-lib` + `@pdf-lib/fontkit` + 导出前 `subset-font` 子集化** | `jspdf`（体积与控制力差）；`pdfmake` 0.3（本轮 ESM 构造失败，且浏览器要 vfs）；`@react-pdf/renderer`（React/Yoga，与 D20 Worker 硬冲突，本轮未装进 probe） |
| **字体子集** | **`subset-font`**（HarfBuzz wasm，本轮 22 ms 把 SimHei 9.7 MB 切到 16 KB） | 把完整 CJK 字体打进每次 PDF；按站内已用字裁阅读云字体（那是 13.3 的另一件事） |

PDF 下载契约：点击后 `Blob` 下载，**禁止 `window.print()`**。本 probe 全程未调用 print。

实现时仍须自写：中文换行分页、KaTeX→SVG/构建期 HTML 投影、SVG/Mermaid 入 PDF 的矢量通道。库只负责字节容器与字体嵌入，不负责文档引擎。

## 环境

| 项 | 值 |
|---|---|
| 日期 | 2026-08-21 |
| OS | Windows 10 系；字体 `C:\Windows\Fonts\simhei.ttf`（9,745,792 B）。生产应改用 OFL 的思源宋 / Noto Serif CJK，不把 SimHei 许可证写进站点 |
| 样本文 | 80 段中英混排，8,630 字符（模拟厨房水槽长文，不是 245 KB HTML 全文） |
| 主仓 lockfile | **未**出现 `docx@` / `pdf-lib@` |

## 维度对照

| 维度 | `docx` | `pdf-lib`+fontkit+subset | `jspdf` | `pdfmake` 0.3 |
|---|---|---|---|---|
| 中文嵌入 / 子集 | OOXML 不嵌字体，Word 用本机字；XML 含中文正文 | 子集 16 KB；6 页 PDF **18,770 B**。Worker 未子集时 **5,187,609 B** | 嵌入成功；4 页 **233,826 B**（文本更短仍比 pdf-lib 大约 12×） | Node `PdfPrinter is not a constructor`（ESM 导入失败） |
| 长文档分页 | Word 负责；probe 80 段合法 `w:p` | 自写 `widthOfTextAtSize` 折行，**6 页** | `splitTextToSize`，4 页 | 未跑通 |
| KaTeX | 库不懂 TeX；probe 写成 `E = mc^2` 字面量 | 同左；用可选择文字+矩形卡代替 | 同左 | — |
| SVG 矢量 | 需 `docx` DrawingML，本轮未嵌 SVG | **无原生 SVG**；只能路径/PNG | 弱 | 声称有，本轮没跑到 |
| 包体积（probe node_modules 粗算） | dist 仅 ESM 入口（exports 限制，未扫到 package.json） | pdf-lib 目录 19 MB（含非 dist）；运行时实际 min 构建需打包期再量 | **30 MB** 目录 | 15 MB 目录 |
| Web Worker | 纯 JS，**可以** | **可以**（`worker_threads` 984 ms 出 PDF） | 可以，但字体要进 VFS | 浏览器靠 vfs，本轮 Node API 失败 |
| DOCX 修复警告 | 合法 ZIP + `[Content_Types].xml` + `word/document.xml`，无 `vbaProject`。**Word/WPS 人工打开仍待人做** | n/a | n/a | n/a |
| `window.print()` | 未使用 | 未使用 | 未使用 | — |

## 实测数字

来自 `node run-probe.mjs` 与随后 `PDFDocument.load`：

| 产物 | 数字 |
|---|---|
| `subset-font` SimHei 90 字 | 9,745,792 → **15,964 B**（22 ms，ratio 0.0016） |
| `probe.docx` | **9,260 B**；生成 17 ms；PKZIP；含 document.xml |
| `probe-pdf-lib.pdf` | **18,770 B**；**6 页**；无 `/JavaScript` `/Launch`；生成 75 ms |
| Worker `pdf-lib` 全文 SimHei | **5,187,609 B** / 1 页（反例：不子集就不可用） |
| `probe-jspdf.pdf` | **233,826 B**；4 页；有 `/FontFile2` |
| 主仓 lockfile 是否污染 | `mainLockfileMentionsDocx=false`，`pdf-lib=false` |

`document.xml` 为 OOXML `w:document`/`w:p`/`w:t`，标题 `w:pStyle Heading1`，80 个正文段。控制台用 ANSI 读中文会乱码，文件本身是 UTF-8。

## 各候选评语

### `docx` — 采用

唯一认真的 OOXML 生成器。浏览器与 Node 同一套 API，适合 Worker。不把讨论写成 `altChunk`/OLE。P1 实现要把标题/列表/表格/代码/图片映射到它的 AST，并按 12.4 禁止外部关系与危险 URI。

**待人：** 用 Word 与 WPS 打开 `.tmp/pdf-docx-probe/out/probe.docx`，确认无「修复」对话框。无人值守无法代替这一步。

### `pdf-lib` + `@pdf-lib/fontkit` + `subset-font` — 采用

唯一同时满足：纯 JS、Worker、中文可嵌入、体积可被子集压到十几 KB、无 print。代价是**没有排版引擎**：分页、孤行、代码换页、表格都要自写，这与「一份 Export IR 再投影」反而同构——不要让 React 排版进 Worker。

硬约束：每次导出只嵌入**当次文档用字**的子集；阅读云字体切片仍禁止按站内已用字裁（13.3）。导出字体从 OFL 源加载，不进 `out/` 首屏。

### `jspdf` — 不采用

能加 CJK 字体，但同样长度下文件大约 12×，API 偏画布，和 Canonical IR 投影别扭。目录体积 30 MB 级，动态 import 也偏肥。

### `pdfmake` — 不采用

0.3 的 Node 入口在本轮 ESM 下不是 `PdfPrinter` 构造器。浏览器 CJK 长期依赖自己做 vfs。不值得为它再赌一层封装。

### `@react-pdf/renderer` — 不采用（未装）

需要 React 树与 Yoga。D20：DOCX/PDF 必须在 Worker 且可取消。把 reconciler 搬进 Worker 能做，但取消/包体/无 DOM 的成本高于 pdf-lib 自写分页。本轮为避免 React 进 probe 依赖树而未 `pnpm add`；若人否决，再开一轮对照。

## KaTeX / SVG 怎么接（实现约束，不是另选库）

- 文章公式已是构建期 HTML。PDF/DOCX 不要在导出时再跑一套 TeX 解析器；把构建期的 SVG/HTML 快照投进去。
- `pdf-lib` 无 SVG parser。P1 实现必须带一个**明确**的 SVG→PDF 路径（独立小库或预栅格化）。架构写「Mermaid/SVG 优先矢量」：不要默认整页 PNG。此条标 **needs-decision**（矢量库 vs 可接受的 PNG 降级上限）。

## 待人确认

1. Word + WPS 打开 `probe.docx` 有无修复警告。
2. 导出正文字体用哪份 OFL 文件（建议 Noto Serif CJK SC Regular），以及是否允许 Worker 首次从 CDN 拉完整字体再子集（体积大、可缓存）。
3. SVG 进 PDF：上矢量转换，还是 Mermaid/SVG 用 PNG 快照直到有转换器。
4. 是否同意不把 `@react-pdf/renderer` / `jspdf` / `pdfmake` 写进主仓。

## 复现

```powershell
Set-Location .tmp\pdf-docx-probe
pnpm install
node run-probe.mjs
```

不要在仓库根目录 `pnpm add docx`。P1 实现 issue 获授权后再进主仓，且必须动态 import，不进阅读首屏。
