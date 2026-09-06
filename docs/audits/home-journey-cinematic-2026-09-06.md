# 首页星河叙事：实现与连续性验收

## 范围

- 分支：`feat/home-journey-cinematic-3d`。
- 基线：开始任务时的 `main`，`91f621a315946ae8d81cd775858135fad2fb1f1d`。
- 首页仍是一套 500vh 滚动叙事；未修改博客目录/阅读引擎、文章内容、部署配置或依赖清单。
- 使用已安装的 frontend-design、creating-ae-grade-gsap-motion、vercel-react-best-practices 与 webapp-testing 指导设计、时间轴、按需加载和浏览器验收。保留原 G33/G04 基础，不为用户的交互主页引入视频运行时。

## 每章的独立内容

| 章节 | 视觉主体 | 实现 |
| --- | --- | --- |
| 序幕 | 银河与「羽升」 | 多尺度密度场烘焙成 768×512 星云纹理；暗尘带、冷暖星层、视差与微闪；四个可发现星签 |
| 散 | 从真实汉字离散 | Pretext 确定字形位置；64 个共享网格三角窗沿原字切开，保留字形来源与 3D 旋转，不再循环随机小字代替碎片 |
| 聚 | 万字归书 | 重叠纸面遮挡接续成书；玄青织物封面、金边、真实「羽升集」题签、四眼曲线针脚、层叠页边 |
| 启 | 开卷与活字 | 弧长保持的卷页曲面，翻页不改变 z 深度且终态平铺；连续竖排文案、分离的升起/落雨轨迹、羽升自题句与中缝渐亮 |
| 门 | 阈限与穿越 | 深色嵌板、细金边、窗棂与门环；门叶旋开，镜头穿门；平面光在近裁面交叉前交给屏幕曝光 |
| 主页 | 四卷内容入口 | 长文古籍、随笔折页、作品几何册、身份藏印各有自己的小型 CSS 物件；保留共用绳挂导航和纸面卡片 |

## 交互与降级

- 四个星签有明确 button 名称、44px 命中区、键盘等价操作、发现计数；每次点击触发有限星座路径/光波，不增加全场粒子的射线检测。
- 书上的题签、针脚与纸页可点击；右下角三个语义按钮提供键盘等价入口。
- 左侧章节控制可直接抵达各章观看位置。显式章节选择保持自己的停靠位置，直到下一次真实滚轮/触控/导航键输入才恢复四分点吸附。
- 入门后的星签移入卡片下面的正常滚动布局；不在矮屏上覆盖入口链接。
- 移动/粗指针保持轻量内容入口；reduced-motion 与不支持 WebGL2 的设备呈现可用终态。

## 性能实现

- 星云噪声只在挂载时烘焙，运行时仅采样一张纹理；星点批量渲染。
- 灯光数量不因场景隐藏改变，避免章节交界重新编译全部受光材质。
- 可交互前预编译 shader、上传小型程序纹理。
- 标签隐藏、画布离屏、入门后进入 demand 模式；倒滚恢复连续渲染。
- 画质采样器使用常量空间计数、不同升降档阈值、冷却期；低档 DPR=1，高档上限1.6。QA 不参与自适应画质。
- 共享几何/纹理/材质有明确释放路径；书页和包角细节使用实例绘制。

## 验收结果与口径

### 自动化

- TypeScript strict 与 ESLint 全项目通过；不新增 suppression。
- 单元测试：50 个文件，394 passed，3 个既有 Windows 文件系统 fixture skipped。
- 浏览器回归：9 passed。覆盖键盘星签、书本语义入口、正反章节切换、相同 QA 画布重载一致、移动/减弱动态效果不加载 3D、WebGL 不可用降级、末章待机及倒滚恢复、真实章节吸附、矮屏命中区。
- 静态构建：54 个路由导出；四个 postbuild 测试通过。另用项目指定的 Node22.11.0 运行完整构建成功（运行时来自隔离npm缓存，未修改依赖与锁文件）。
- `out/`：553 个文件，最大单文件 3,569,667 B；未超过20,000个文件/25MB单文件限制。

### 密集抽帧

`scripts/dev/home-journey-dense-qa.py` 通过 QA 专用事件对真实 DOM/Three 场景逐帧 seek；每个1/60秒采一帧，0–600共601帧，1440×900。字体 CDN 在验收浏览器内阻断，以系统衬线降级路径保证可复现；不改变生产字体服务。

- 原问题：汇聚遮挡在166–168帧急剧变化；光门在555帧因近裁面越过发光平面产生突变。
- 修复：把纸面进入铺开到完整42帧，明确出场初态；在镜头穿过发光平面前渐出该平面并衔接曝光。
- 同口径的最大相邻帧平均 RGB 差由100.8035降为约14.3（0–255量纲）；这是连续性辅助指标，不是主观视觉分数。
- 最终密集序列未出现 pageerror；完整原始PNG、5张每5帧一格的接触表与manifest保存在 `.tmp/home-dense-verified/`。
- 正反回放的隐藏节点会保留未显示的未来/过去 tween 值，所以姿态校验仅针对实际可见节点；不拿隐藏对象的 transform 判断画面跳变。
- 可见文字/碎片姿态正反检查17/17完全一致，最终密集检查脚本退出0。真实3D文字边缘仍有浏览器抗锯齿缓存带来的极小图像差异：14/17抽查点PNG字节相同；12%、20%、25%的差异仅在字形边缘，平均RGB差小于0.017/255。不要写成17/17 PNG完全相同。
- `.tmp/home-dense-release/journey-60fps.mp4` 是从601张浏览器PNG编码的审片视频：1440×900、60/1 fps、601帧、10.016667秒。它证明序列采样密度，不证明实时渲染帧率。

### 实时帧率（本机，不作跨设备承诺）

工具：`scripts/dev/home-journey-performance.py`。Windows、Chrome headless、真实 NVIDIA GeForce RTX5060 Laptop GPU（ANGLE/D3D11）、1440×900、DPR1.5、静态生产导出、10秒连续滚动；没有并行截图。

| 连续滚动轮次 | rAF平均频率 | 中位帧间隔 | p95 | p99 | >25ms帧 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 131.17fps | 8.3ms | 12.6ms | 37.6ms | 26/1312 |
| 2 | 129.12fps | 8.3ms | 12.6ms | 37.5ms | 26/1292 |
| 3 | 153.10fps | 4.2ms | 12.5ms | 33.4ms | 26/1532 |

大多数帧满足60fps的16.67ms时间预算，但仍有首遇内容/合成时的慢帧，不能宣称恒定60fps或无卡顿。此前60Hz调度下驻留场景约59.9fps；完整滚动另有54.7–56.5fps记录，浏览器刷新调度和测试模式不同，不删除较差记录。默认 Chromium 的 SwiftShader 是CPU软件渲染，实测18–29fps，不应冒充显卡成绩；它会触发降档。

### 体积

静态导出实际桌面脚本请求集合减去移动请求集合，再对文件gzip：317,457 B（约310.0KiB），低于409,600 B预算；计入Pretext等桌面追加脚本，不只数three所在chunk。原始证据 `.tmp/home-dense/bundle-metrics.json`。未计入 CDN 字体、全站公共脚本、浏览器内生成的纹理显存。

## 复现

```powershell
# 常规检查按 AGENTS.md；受本机祖先 pnpm workspace 影响时可直接调用本仓库 CLI。
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node node_modules/vitest/vitest.mjs run
node scripts/build/run-next-build.mjs
node node_modules/vitest/vitest.mjs run --config scripts/build/vitest.config.ts

# 在独立终端启动本分支服务；不要复用其他工作树的9981。
node node_modules/next/dist/bin/next dev -p 9983
python scripts/dev/home-journey-dense-qa.py --base-url http://localhost:9983

# 另一个终端预览真实静态输出，再测实机帧率。
python -m http.server 9982 --directory out --bind 127.0.0.1
python scripts/dev/home-journey-performance.py --base-url http://127.0.0.1:9982 --runs 3
```

没有推送分支、创建PR或发布线上。`.tmp/`的审片资料不进Git。
