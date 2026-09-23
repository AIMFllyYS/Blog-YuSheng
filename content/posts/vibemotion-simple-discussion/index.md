---
schemaVersion: 1
title: VibeMotion简单小讨论
description: 不要问「AI 会不会做这个动画」，先问有没有一种表示方式让它容易做：VibeMotion 测的是模型×框架，不是裸模型能力。
publishedAt: 2026-09-23T22:20:00+08:00
section: ai-mflly-notes
tags:
  - AI视频
  - 方法论
  - AI
draft: false
---

# VibeMotion简单小讨论

<html-embed id="vibemotion-map" src="./embeds/vibemotion-map/index.html" title="VibeMotion 边界图谱" height="640">
如果交互预览没有加载，可点击卡片右上角的「打开」进入完整页面；下方仍提供适配本站目录、划词注释和导出的完整正文。
</html-embed>

<aside-note id="reading-modes" kind="addon" title="两种阅读方式">
上方完整 HTML 保留了原始视觉、17 个镜头、时间轴导航、能力周期表、杠杆计算器、虚拟摄影棚和右下角 Agent；下方是适配本站目录、划词注释、Agent、搜索与导出的富文本正文。交互版内的文字不参与站内划词注释，如需批注，请在下方正文选择对应内容。
</aside-note>

> VibeMotion 边界图谱

不要问「AI 会不会做这个动画」。先问：有没有一种<text-mark tone="thesis" effect="fluorescent">表示方式</text-mark>，让 AI 很容易做它。

这是整场对话的核心原则。VibeMotion 不是「AI 写代码生成视频」这么浅的一句；它研究的是：当 AI 成为主要创作者之后，什么样的视频表示方式、动画框架、组件库、Skills 和运行时，能够最大程度释放模型的视觉表达能力。测的不是裸模型，而是<text-mark tone="thesis" effect="pill">模型 × 框架</text-mark>。

## VibeMotion是什么

不是「AI 写代码生成视频」，而是：把<text-mark tone="thesis" effect="fluorescent">视觉意图</text-mark>编译成一个可编辑、可执行、可确定性渲染的动态视觉系统。

<compare-block id="pipe-aigc-vs-vm">
<compare-side role="a" title="传统 AIGC 视频">
Prompt → Pixels。结果是一块不可编辑的视频。想改一处，只能整段重抽，且无法保证其余不变。
</compare-side>
<compare-side role="b" title="VIBEMOTION">
Prompt → 场景 / 运动表示 → Code → Renderer → Pixels。中间多了「可计算的视觉表示」：每一层都能被读、被改、被复用。改第 3 秒的节奏，只动时间线里那一段。
</compare-side>
</compare-block>

多出来的中间层就是全部价值：<text-mark tone="good" effect="wash">可编辑、可复用、可局部修改</text-mark>。Prompt → Pixels 做不到「只改第 3 秒」。

Manim、Remotion、HyperFrames、Three.js、Blender 不是五个「视频软件」，而是<text-mark tone="thesis" effect="fluorescent">五种视觉中间语言</text-mark>。

| 框架 | 它说的是哪种中间语言 |
|---|---|
| Manim | 数学对象 + 变换。你说「让这个公式变形成那个」，它听得懂：MathTex、Transform 就是它的词汇。 |
| Remotion | 帧 → React 状态。视频是一个以帧号为输入的 React 组件树。自由度高，但所有动画逻辑要自己写。 |
| HyperFrames | HTML + seek(t)。任何 Web 动画，只要能按时间跳转到确定的一帧，就能逐帧截成视频。 |
| Motion Canvas | Generator 顺序叙事。「显示标题 → 等待 → 移动 → 显示图 → 变形」——代码读起来就是导演的分镜口令。 |
| Three.js | 3D 场景图。场景、灯光、材质、摄影机。说的是摄影棚的语言。 |
| Blender | DCC 工程文件。完整建模、材质、骨骼、物理、摄影机；通过 MCP 让 AI 操作一个专业工程。 |

开源生态里已有叫 Vibe Motion 的组织，定义是「Prompts → code → motion graphics」，下面已有 Remotion 脚手架、Skills、SRT → 分镜 → HyperFrames → FFmpeg 的项目。定义可以沿用，但不要停在那一层。

## 视频=时间→场景状态

「视频的本质是蒙版 + 关键帧」——在 AE 体系里成立。再往下一层：<text-mark tone="thesis" effect="fluorescent">关键帧只是定义 SceneState(t) 的一种方法</text-mark>，蒙版属于合成层。

$$
\text{Frame}(t) = \text{Render}(\text{SceneState}(t),\ \text{Camera}(t),\ \text{Assets},\ \text{Compositor},\ \text{Seed})
$$

`SceneState(t)` 包括每个对象的位置、大小、角度、颜色、透明度、形状、文字、材质，以及摄影机、灯光、粒子、shader、骨骼和物理世界的状态。

定义状态的方法远不止关键帧：<text-mark tone="note" effect="wash">数学函数、spring、物理、粒子、shader、rig、约束、状态机、路径跟随、音频驱动、程序噪声</text-mark>。

所有框架都在解决同一件事：如何定义 SceneState(t)，如何把它渲染成 Frame(t)。这就是 VIBEMOTION 的统一理论。

勾上「定格量化」：`sampledT = floor(t × 12) / 12`——定格不需要找一个 StopMotion.js，它是叠在任何渲染器上的<text-mark tone="thesis" effect="pill">时间量化</text-mark>。

## Manim语义压缩

不是 Manim 渲染更强，而是它<text-mark tone="thesis" effect="fluorescent">替模型做掉了大量决策</text-mark>。模型只剩导演决策，不必重新发明动画工程。

同一句导演语言：「一个公式从左边移到中央，然后某一项变红，再变形成另一个公式。」

<compare-block id="manim-vs-raw">
<compare-side role="bad" title="裸 HTML / React">
要自己决定 DOM 怎么组织、absolute 还是 flex、字体、SVG 还是 HTML、transform、layout、字号、baseline 对齐、easing、时长、morph 怎么实现、公式怎么渲染、每个元素如何定位、动画生命周期。一句导演语言对应几十上百个实现决策；每个决策都是一次出错机会。
</compare-side>
<compare-side role="good" title="Manim">
MathTex、Transform、ReplacementTransform、`.animate.move_to(ORIGIN)`、`set_color(RED)`。只剩三件事要模型决定：从哪移到哪、哪一项变红、变成哪个公式。
</compare-side>
</compare-block>

<aside-note id="semantic-compression" kind="callout" title="语义压缩" tone="thesis">
Manim = 高语义压缩 · 强先验 · 小搜索空间。裸 React / HTML / Canvas / Three.js = 低压缩 · 高自由 · 大搜索空间。Manim 提供的不只是 API，而是一套领域本体（Domain Ontology）：数学动画世界已经替 AI 分好类了。
</aside-note>

再差的模型用 Manim 也能做出好动画；Remotion 差模型做出来很垃圾。不是渲染器谁更强，是搜索空间谁更窄。

## 测模型×框架

「这个模型不会做动画」，很多时候其实是：<text-mark tone="warn" effect="fluorescent">你让它在一个太宽的搜索空间里自己发明动画</text-mark>。

正确的实验单位是 Claude × Manim、Claude × Remotion、GPT × 同样几套，而不是 Claude vs GPT。目标产物是一张 <text-mark tone="thesis" effect="pill">AI Motion Capability Map</text-mark>，而不是「哪个模型最好」的排行榜。

两个维度量一个框架：

- **Framework Leverage Index** ≈ 弱模型得分 / 强模型得分。强 9.2 / 弱 8.5 → 框架本身给了 AI 极强增益；强 9.5 / 弱 3.5 → 能力几乎全靠模型智力。
- **Ceiling Score**：最强模型 + 无限迭代时，这个框架最高能做多好。这不是学术公式，是研究工具。

| 系统 | 杠杆 | 上限 |
|---|---|---|
| Manim | 高 | 特定领域很高 |
| Motion Canvas | 预计较高 | 高 |
| HyperFrames + Skills | 高 | 很高 |
| 裸 Remotion | 中 | 很高 |
| 裸 Three.js | 低 | 极高 |
| Three + Scene Kit + Skills | 中高 | 极高 |
| 裸 Blender Agent | 低 | 极高 |
| Blender + 专用 Skills/Assets | 中高 | 极高 |

最终质量可以近似写成乘法，不是严格公式，但思维方式重要：模型能力 × 框架语义压缩 × 视觉先验 × Skills 质量 × Asset 质量 × 反馈能力 × 时间线确定性 × 视觉审美约束。把任意一项拉到很低，整体就塌——这就是为什么只换模型常常没用。

## HyperFrames seek(t)

HyperFrames 的关键不在 HTML，在 <text-mark tone="thesis" effect="fluorescent">seek(t)</text-mark>。时间被冻结：seek(0) 截一帧，seek(1/30) 截一帧……浏览器从网页播放器变成了确定性视频渲染器。

任何库，只要能做到 <text-mark tone="good" effect="kbd">seek(t) → 确定的一帧</text-mark>，理论上都能接进 VIBEMOTION。所以它更像「Web 动画运行时宿主」，不是「HTML 视频库」。

要避开的三样：`requestAnimationFrame`、`Date.now()`、未固定 seed 的 `Math.random()`。

HyperFrames 官方 animation skill 已经统一接入 GSAP、Lottie、Three.js、Anime.js、CSS Keyframes、Web Animations API、TypeGPU，而且这些 runtime 可以共存在同一套 composition 里。

<aside-note id="heygen-eval" kind="addon" title="HeyGen 的方法论">
判断框架是否「在和 Agent 对抗」——看是不是必须用最强模型才能出可用结果。他们围绕 Gemini Flash 能稳定写出的东西收紧 authoring model，跨模型 eval，失败在哪就收紧 runtime 和 Skills。当前采用浏览器逐帧 capture + FFmpeg。
</aside-note>

## Runtime vs Skills

收集所有好 Skill：对。塞进一个超级 SKILL.md：错——<text-mark tone="bad" effect="fluorescent">那会把模型推回大搜索空间</text-mark>。Router 只需要知道什么时候加载什么。

产业趋势已出现：<text-mark tone="thesis" effect="wash">视频框架只是 Runtime；真正教 AI「如何做视频」的东西正在迁移到 Skills</text-mark>。

- HyperFrames：21 个公开 Skills，`/hyperframes` 是 Router；Skills 教通用 Web 知识覆盖不了的：项目格式、动画规则、媒体工作流、验证循环。
- Remotion：官方 Agent Skills 拆成 best-practices router、create、markup、studio、render、maps、captions、interactivity、multimedia、docs、upgrade、SaaS。
- 社区：`p5-paint-animation`、`vox-explainer`（针对 60–90 秒 collage 风格解说）。

「把所有动画 Skills 找出来对比、拆解、整合」不是旁支，<text-mark tone="thesis" effect="fluorescent">本身就是主线</text-mark>。知识和软件架构一样：模块化。

第一轮对话提出的模块化结构可以当地图，不必当标准：director、motion-grammar、style（vox、kinetic-type、documentary、ui-demo、science-explainer、stop-motion）、runtime（manim、hyperframes、remotion、motion-canvas、three、blender）、asset、cinematography、motion-qa。

## 七种AI边界

要的不是「裸模型能力」，而是：<text-mark tone="thesis" effect="fluorescent">给 AI 配上某种现成能力后，它能稳定做到什么程度</text-mark>。每种边界都能被工程手段缩小。这叫 Boundary Engineering：不只等模型变聪明，而是主动改变模型要解决的问题。

| 边界 | 问题 | 典型翻车 | 用什么缩小 |
|---|---|---|---|
| 知识边界 | AI 知不知道这个库、这个技术存在？ | 不知道 gl-transitions，就以为高级转场需要很强的 shader 能力，最后只做出 opacity 0→1。 | Capability Discovery：维护一张能力图鉴，让模型先知道「有什么材料」。 |
| 表示边界 | 这个库本身能不能表达这个效果？ | 用 DOM 硬堆大量图片 + 蒙版 + 模糊 + 混合模式，性能和效果一起崩。 | 换一个能表达它的库：PixiJS（GPU 2D compositor）、shader。 |
| 抽象边界 | 要写多少底层代码，还是已有高级 primitive？ | 「标题分裂成 30 个字母沿曲线爆开再组成 Logo」，裸 HTML/CSS 下一般模型 3 分。 | GSAP SplitText + MotionPath + SVG + MorphSVG：可能直接变 8 分。圆 → 地图 → 柱状图：D3 + Flubber + ECharts。 |
| 规划边界 | AI 能不能把复杂镜头拆成正确步骤？ | 用户说「这里要一个有冲击力的镜头」，AI 直接开写 300 行 React。 | 先拆层：意义 → 视觉概念 → 构图 → 运动 → Runtime。不要一步从 1 跳到 5。 |
| 空间边界 | 多元素、3D、摄影机、碰撞时还能不能管住关系？ | 穿模、摄影机乱、灯光难看、比例异常、人物站位错误。 | Rapier（碰撞）、固定 camera rig、现成人体动画、scene graph 预设。 |
| 时间边界 | 能不能控制节奏、timing、stagger、转场？ | 所有元素慢慢 fade in，节奏拖沓——「高级感」变成「慢慢浮进来」。 | 写成帧数约束（入场 6–15 帧、死区 ≤12 帧）+ Animation Map 审计。 |
| 反馈边界 | AI 能不能看到结果、定位问题、局部修改？ | 说「只改第 3 镜」，结果其他镜全变了；或者从不自己渲染检查。 | seek(t) 确定性渲染 + 逐帧截图回看 + Revision Test。 |

AI 明明「会 Three.js」，做复杂 3D 却穿模、摄影机乱、比例怪——未必是不会 3D，而是<text-mark tone="warn" effect="wash">缺少 constraint / collision / rig / camera preset 等中间先验</text-mark>。

## 能力元素周期表

组件库不是工具箱，而是<text-mark tone="thesis" effect="fluorescent">被前人编码好的专业知识</text-mark>。研究的最小单位不是「框架」，而是「它白送了 AI 哪个 primitive」。

看到一个库，别问「能不能用它做视频」——几乎都能。要问：<text-mark tone="thesis">它给 AI 增加了哪个以前很难实现的 primitive？</text-mark>

很多材料本来不是为视频发明的：Two.js 自称深受 flat motion graphics 启发；EffectComposer 像 AE 的效果堆栈；PlayCanvas 已有 HDR Bloom、SSAO、DOF、LUT。

<inset-card id="gl-transitions-case" eyebrow="例" title="认知边界：gl-transitions" kicker="转场原子" tone="thesis">
不知道 gl-transitions，会以为高级转场需要很强的 shader 能力；知道以后，只需选对 transition + 调几个 uniform。模型能力需求突然降低一个量级。转场被定义成：两张 texture + progress 0→1 + GLSL 函数。
</inset-card>

研究深度应该停在 Capability Primitive / Library API abstraction。比如 Rapier，不必学 GJK、EPA、约束求解，只需知道它给 rigid body、collider、sensor、joint、collision、kinematic object，覆盖 2D/3D。Konva 的 `Tween.seek()` 天然支持跳到时间点。

第一波地图可以按层摊开：时间线（GSAP / Anime.js / Motion / Theatre.js）、视频框架（Remotion / HyperFrames）、程序动画（Motion Canvas / Manim）、SVG（D3 / Flubber）、手绘（Rough.js / Rough Notation）、Canvas 场景图（Konva / Fabric / Paper / Two）、GPU 2D（PixiJS）、Creative Coding（p5.js）、数据动画（D3 / ECharts）、3D（Three.js / R3F / Babylon / PlayCanvas）、物理（Rapier / Matter.js / cannon-es）、着色与后期（GLSL / WebGPU / TypeGPU / EffectComposer / gl-transitions）、角色与 UI runtime（Rive / Lottie）、地图（MapLibre / deck.gl）、音频（Tone.js）、拍摄与 IO（Playwright / FFmpeg / WebCodecs / Pretext）、DCC（Blender）。

## Agent使用说明书

API Skill 教 AI 当程序员；<text-mark tone="thesis" effect="fluorescent">Grammar Skill 教 AI 当导演</text-mark>。模型本来就会调 API，稀缺的是：什么时候值得用、什么时候千万别用。

<compare-block id="flubber-docs">
<compare-side role="a" title="程序员 API 文档">
教怎么调：`flubber.interpolate(fromShape, toShape, options)`，options 有 `maxSegmentLength`、`string`；还有 `toCircle`、`combine` / `separate`；返回一个 `t → path` 的函数。
</compare-side>
<compare-side role="b" title="Agent 使用说明书">
教何时用：能做 SVG shape morph；尤其擅长拓扑不完全匹配的两个形状做 best-effort 插值；Logo morph、地图 morph、图形变形时用；复杂带洞、要求完全拓扑对应的工业级 morph 时别用；只做 circle → square 且没有叙事目的，就是平庸；高级组合是 Flubber + D3 + GSAP + texture overlay。
</compare-side>
</compare-block>

只做「搜 GitHub → 把 README 塞进 Skill」，最后得到一个巨大的<text-mark tone="bad" effect="wash">垃圾知识库</text-mark>。价值在于经过实际渲染验证的能力图鉴。

每个组件一张鉴定卡，固定字段：原子能力、最适合场景、视觉上限、AI 友好度、首次成功率、组合能力、Seek 能力、高级效果、失败模式、平庸模式、最佳 Recipes、模型测试、实际 Demo、已有 Skill、证据状态。这<text-mark tone="muted" effect="dim">不是在定义新标准</text-mark>，只是统一记录研究结果。

证据也分三档：看过文档 → 跑通 Demo → 实战验证。护城河在第三档。

稀缺的是「导演知识」（Director Knowledge）：

- **Cinematography** — 不是教 Camera API，而是 wide 为什么用、close-up 为什么用、何时 dolly / truck、焦距、视差、视线、纵深、调度。
- **Editorial Motion** — 不是教 `translate()`，而是信息层级、视觉比喻、预备动作、连续性、graphic match、转场逻辑、视觉节奏。
- **Vox Grammar** — 不是「背景加纸纹」，而是什么内容该变地图、该变拼贴、该用档案；注释如何服务论点；字体如何承担叙事。Style 应独立于 Renderer。不要去找一个「Vox.js」。

## AI爱慢动画

是<text-mark tone="warn" effect="fluorescent">导演约束缺失</text-mark>。没有约束时，fade in → hold → slide → fade out 永远最安全。而节奏可以从审美吐槽，变成可检查的工程约束。

AI 动画最大的问题不是 Render Error，而是 <text-mark tone="bad" effect="pill">Generic Success</text-mark>：技术成功，艺术失败。

每个动画必须承担一个功能：Reveal、Focus、Relationship、Transformation、Transition、Emphasis。而不是「因为要有动画，所以动一下」。

可以写进 Skill 的节奏约束：

```text
No default 1s fades.
Every shot must contain a new informational beat.
Avoid more than 12 frames of motionless dead time.
Entrance animations should finish within 6–15 frames.
Do not animate decorative elements unless they reinforce
  hierarchy, direction, rhythm, causality, or transition.
Every animation must have a semantic purpose.
```

可以做 <text-mark tone="thesis" effect="wash">Animation Map</text-mark> 自动审计：哪些对象在动、哪里是视觉死区、每秒多少信息拍、哪些动画过长、stagger 是否异常。HyperFrames 的 animation skill 已包含 animation-map / choreography audit 思路。

「20 秒讲完一分钟的内容」，本质就是<text-mark tone="thesis" effect="fluorescent">信息拍密度</text-mark>约束。

Generic Motion Failure Modes 也可以单独记：重复 fade、重复居中构图、所有 easing 一样、一切东西都在动、无意义漂浮、过长入场、每镜都 zoom、所有字卡同一种 reveal、转场和语义无关、没有视觉惊喜、没有节奏对比。这些不是 API 文档会告诉模型的。

## AE/MG/定格

理解一点本质，就能推到对应组件。<text-mark tone="thesis" effect="fluorescent">AE 不是一个特效，而是一组能力的集合</text-mark>；MG 是表达类别不是软件；定格是时间量化。

AE 本来就不是纯 GUI 世界：<text-mark tone="note" effect="kbd">timeline + properties + expressions + compositor + effects</text-mark>；expression 本身是 JavaScript 衍生语言，任意可 K 帧属性都可用 expression。

| AE 能力 | 它在干什么 | Web 等价物 |
|---|---|---|
| Layer Compositor | 图层与预合成 | DOM 层 / Canvas 图层 / Pixi Container + blend mode |
| Property Animation | 属性 + 关键帧 + Graph Editor | GSAP timeline + 自定义 easing 曲线 |
| Mask / Matte | 决定哪里可见 | CSS mask · SVG clipPath · Pixi mask |
| Effects Pipeline | 模糊、扭曲、调色、噪声 | CSS filter · Pixi filters · EffectComposer · shader |
| Text Animator | 按字符范围的 animator + selector | 逐字拆分 + stagger（GSAP SplitText） |
| Expressions | JS 衍生语言；任何可 K 帧的属性都能用 | 本来就是 JS：用函数驱动属性 |

<compare-block id="ae-level-vs-workflow">
<compare-side role="good" title="AE 级画面输出 · 可达">
MG、文字动画、信息动画、UI 动效、图形转场、程序化动效——尤其是重复性强、参数化、数据驱动、组件化的内容。
</compare-side>
<compare-side role="bad" title="完整替代 AE 工作流 · 尚未">
手工 rotoscoping、tracking、素材清理、抠像、插件生态、艺术家逐帧打磨、特殊合成。Adobe 也已在 2026 年 AE Beta 里加入 AI Assistant。
</compare-side>
</compare-block>

要测的不是「能不能替代所有 AE」，而是<text-mark tone="thesis">在哪些视频类型里 Code + Agent 已经能替代</text-mark>——这样更容易找到真突破口。

MG = 把图形设计的对象放进时间。对象是文字、shape、icon、image、diagram、chart、texture；动作是 transform、reveal、mask、morph、stagger、camera、transition、composite。真正难的不是「X 从 100 变成 200」，而是：为什么这个元素<text-mark tone="thesis">现在</text-mark>出现？为什么是<text-mark tone="thesis">这个方向</text-mark>？这个转场怎样<text-mark tone="thesis">连接前后两个概念</text-mark>？什么东西该<text-mark tone="muted">静止</text-mark>？什么该跟着旁白 beat 动？

定格风格 = 时间量化 + pose-to-pose + 手作纹理 + 轻微机位抖动 + 曝光浮动 + 阶梯式灯光 + 木偶约束。AE 里对应的是 Hold Keyframe。定格可叠加在 Three.js、p5、SVG、Canvas、Rive、Blender 任一渲染器之上。

## 拉片反拆

不要把一个镜头总结成「Vox 风」。<text-mark tone="thesis" effect="fluorescent">拆成可搜索的能力原子</text-mark>，每个原子都能反查到一个已经解决它的库。

一个 Vox 式镜头：照片撕开 → 地图出现 → 红线沿路径延伸 → 摄影机推近 → 标注框弹出 → 背景纹理轻微运动。

<timeline-block id="vox-atoms" title="一个镜头 = 一组能力原子">
- **照片撕开** — mask / path / noise → SVG clipPath、p5
- **地图出现** — SVG / MapLibre / D3
- **红线沿路径延伸** — SVG path draw / GSAP
- **摄影机推近** — transform / 3D camera
- **标注框弹出** — Rough.js / SVG
- **背景纹理微动** — Canvas / p5 / shader
</timeline-block>

研究组件库要双向：<text-mark tone="good">正向</text-mark>看库有什么功能；<text-mark tone="thesis">反向</text-mark>看到想要的效果，再找哪个库已经解决了它。「拉片」经验是一个独特数据源：把好片拆成原子，原子就能进 Skill。

Vox Grammar 的元素可以单独列：editorial typography、paper collage、ripped edges、halftone、scanned texture、map、infographic、annotation、arrows、handwriting、archival footage、parallax、camera push、cutout、hard cut、match cut、graphic match、shape transition、visual metaphor。

## 虚拟摄影棚

3D 定格方向：别把 Three.js 场景当「3D 动画」，当<text-mark tone="thesis" effect="fluorescent">虚拟摄影棚</text-mark>。之后每个视频不是重建世界，而是在同一个世界里重拍一个 Shot。

一个摄影棚包括：Set 场景、Actors 演员、Rig 骨骼约束、Lighting 灯光、Camera 摄影机、Blocking 调度、Timeline 时间线。

这和电影工业的思维完全一致，也正是三点优势：<text-mark tone="good" effect="wash">表现形式更多样、摄影知识能用上、场景可复用</text-mark>。

<compare-block id="web3d-vs-blender">
<compare-side role="a" title="Fast Virtual Production">
Three.js / R3F + Theatre.js + HyperFrames。快速场景、风格化 3D、low-poly、信息图 3D、UI + 3D、镜头、可复用虚拟布景。
</compare-side>
<compare-side role="b" title="High-End DCC">
Blender。rigging、复杂材质、几何、物理、高端灯光、电影级渲染。导出 GLTF/GLB、PNG 序列、EXR、alpha 视频，回主 Runtime 合成。
</compare-side>
</compare-block>

Web 3D 与 Blender <text-mark tone="thesis">不是二选一</text-mark>，而是两层。Theatre.js 能直接给 Three.js 属性打关键帧，是程序化 3D 和传统动画时间线之间的桥。公开稳定版较老（v0.7），1.0 在开发中：当架构思想 + 实验工具。

外围角色也定下来了：<text-mark tone="note" effect="pill">Playwright 负责「拍网站」，Renderer 负责「剪网站」</text-mark>。Playwright 支持 browser context 录制视频文件，定位是 Capture Runtime，不是核心 renderer。WebCodecs 让浏览器本身未来可能成为完整视频引擎：Canvas 可直接转 VideoFrame。

## 统一认知

第一轮 ChatGPT 建议造 Motion IR。反驳成立：时间有限，现在定义标准只会<text-mark tone="warn" effect="fluorescent">用有限的认知提前框死未来</text-mark>。先大规模摸边界，最优结构会自己浮出来。

<compare-block id="route-revision">
<compare-side role="a" title="第一轮建议">
Capability Atlas / Benchmark → Motion IR（渲染器无关的导演中间语言）→ Killer Skill（Vox 语法 或 3D 虚拟摄影棚）。
</compare-side>
<compare-side role="b" title="修正后">
Motion IR 被拿掉——它属于研究后期、看过足够多样本后自然出现的抽象。现在只做四件循环的事：大规模搜集 → 实际鉴定 → 沉淀 Skills → 不停生产视频。
</compare-side>
</compare-block>

要建的不是「最佳视频工作流」，而是 <text-mark tone="thesis" effect="pill">Code Motion Capability Atlas</text-mark>（代码动画能力图鉴）。原则：<text-mark tone="good">允许重复、允许矛盾、允许暂时没有统一答案</text-mark>。

炼丹比喻：主角的炼丹能力，取决于他能把多少药材的特性列举全面。<text-mark tone="thesis">维护最全的 Skills 集 + 最全的组件库集</text-mark>，给效果分级（有创意的 / 安全的 / 平庸的），再让 AI 渐进式披露。

要成为的是 <text-mark tone="thesis" effect="fluorescent">AI Motion Capability Generalist</text-mark>：知道世界上有哪些能力、大概在哪、模型何时能稳定调用、哪几样组合会质变。不必成为 WebGL 专家、Blender 专家或 GSAP 专家。

研究该挖多深，用医学类比：医学生深入到细胞层——不从分子推导，也能做大量有价值的事。知道 Rapier 给你刚体 / 碰撞体 / 关节，就够用。挖到物理规律和哲学，一个月也出不了一条视频。

## 固定变量

同一素材、同一脚本、同一视觉目标、同一时长。否则根本分不清差距来自<text-mark tone="warn">模型、Prompt、Skill、库，还是第一次运气好</text-mark>。

实验单位是 `任务 × 模型 × Library × Skill`。以前人类 benchmark 前端库看 fps / bundle / 内存；AI-native 库要多一个维度：<text-mark tone="thesis" effect="pill">Model Compatibility</text-mark>。有些库人类觉得很牛，却不适合 AI；有些看起来很简单，却极度适合 AI——后者是金矿。

八个固定任务：

1. Kinetic Typography — 10 秒；多层级文字；mask；stagger；节奏
2. Data / SVG Explainer — 图表；morph；annotation
3. Vox Editorial Scene — collage；texture；map；typography
4. UI Product Demo — cursor；click；zoom；callout
5. Procedural Scene — particle；p5；noise；shader
6. 3D Cinematic Shot — camera；light；blocking；DOF；animation
7. 30 秒 Narrative — 6–10 个镜头；连续性；节奏
8. **Revision Test** — 「只把第 3 镜节奏提高 30%，其余不要变。」

<aside-note id="revision-test" kind="callout" title="Revision Test 最关键" tone="thesis">
能不能进生产，不看第一次能不能做出来，看修改是否局部、稳定、可控。
</aside-note>

评分也不要只看「好不好看」：Render Success、Determinism、Prompt Fidelity、Composition、Typography、Motion Quality、Information Density、Pacing、Asset Integration、Revision Locality、Reusability、Code Complexity、Iteration Count、Token / Cost、Visual Ceiling。

本来就有自媒体渠道：每一次「做一个新风格视频」，<text-mark tone="good">本身就是一次 benchmark</text-mark>。

## 飞轮与护城河

内容生产 = 研究，研究 = Skill 数据，Skill 数据 = 下一次质量。护城河不是代码，是<text-mark tone="thesis" effect="fluorescent">经过实际视频生产验证的能力知识库</text-mark>。

四个环节，循环而非排期：

<timeline-block id="flywheel" title="研究飞轮">
- **搜集** — 把 Web 动画、Creative Coding、3D、物理、音频、Shader、字体、地图、数据可视化、DCC、拍摄，以及公开的 Animation Skills 尽量铺开。只问一个问题：它给 AI 提供了什么高级 primitive？
- **鉴定** — 不只读 README，必须生成视频。弱模型测一次、强模型测一次，再组合测试。把结果写进鉴定卡。
- **沉淀** — 只把测过的高价值知识写进 Skills：什么时候用、怎么用、怎么组合、什么不要做、什么容易平庸。
- **生产** — 不停做视频。每一次「新风格视频」就是一次 benchmark，数据回流到下一轮搜集。
</timeline-block>

<compare-block id="context-slop-vs-curated">
<compare-side role="bad" title="别人给模型的">
「做一个高级 MG。」模型只能回到最安全的选择：fade、slide、慢慢 zoom。
</compare-side>
<compare-side role="good" title="你的系统给模型的">
这个镜头是 image → shape transition；不要用普通 opacity；首选 SVG mask + displacement；素材是 vector → 试 Flubber；raster-to-raster → 查 gl-transition；要手撕感 → 叠 Rough / p5 texture；入场控制在 8–14 帧；主动画后 3–5 帧 secondary settle；禁止所有元素统一 ease-out。
</compare-side>
</compare-block>

模型没变，输出完全不一样——因为它拿到的是<text-mark tone="thesis" effect="fluorescent">经过人类审美和实验筛选的搜索空间</text-mark>。这就是「给 AI 最不平庸的上下文」。

先生产、边生产边研究，比闭门半年造一个完美架构，<text-mark tone="good">更适合时间有限的现状</text-mark>。

## 代码视频边界工作站

把能力图鉴做成一个精致的浅色工作台：左侧目录树按方向分区，主页可检索，配一套<text-mark tone="thesis" effect="wash">渐进式披露的百科词典式 Skills</text-mark>。最有价值的是 Skills 和目录树本身。

Skills 的定位<text-mark tone="muted">不一定是指导 AI 怎么做</text-mark>，而是一部系统展示「世界上有哪些牛的组件库、什么效果、哪些真正有创意」的词典。

必须在 Skill 里写清两个核心问题：AI 总生成<text-mark tone="warn">慢视频</text-mark>、总生成<text-mark tone="warn">板块重叠</text-mark>的画面，且<text-mark tone="warn">自己不测试</text-mark>——并引用 HeyGen 官方与最强的现有 Skills。

每个库的词条：有哪些组件、有哪些案例、什么功能最佳、最佳实践、相关网站、一段通用提示词。数据用 JSON 词典式；每个库挑几个最惊艳案例做内嵌动画；React / Next + TypeScript；Manim 等不兼容语言先渲染成视频再嵌入；写不完就挑代表性的；调研为主，不必全测。

工作站里建议先备四份 Skills 草稿：`router.md`（什么任务加载什么）、`anti-slop-rhythm.md`（反慢动画）、`no-overlap-layout.md`（反板块重叠）、`self-test-loop.md`（逼 AI 自测：seek 到关键时间点截帧回看，不看结果不许交付）。

<aside-note id="closing-principle" kind="quote" title="研究原则">
不要问「AI 会不会做这个动画」。先问「有没有一种表示方式，可以让 AI 很容易地做这个动画」。

HeyGen 做 HyperFrames 最有价值的经验就在这里：不是等模型变强，而是不断修改 AI 面对的问题空间，直到相对弱的模型也能稳定出可用结果。
</aside-note>
