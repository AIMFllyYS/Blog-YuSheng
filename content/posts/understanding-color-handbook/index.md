---
schemaVersion: 1
title: 看懂颜色：从小白到能用的色彩课
description: 从显示原理、颜色模型与经典配色，讲到 UI 无障碍、系统配色、影像调色和一次真实界面诊断，建立一套可描述、可测量、可复用的颜色关系方法。
publishedAt: 2026-08-30T14:53:21+08:00
section: yu-studies
tags:
  - 色彩
  - UI
  - 方法论
draft: false
---

# 看懂颜色：从小白到能用的色彩课

<html-embed id="color-handbook" src="./embeds/color-handbook/index.html" title="看懂颜色 · HTML 交互版" height="640">
如果交互预览没有加载，可点击卡片右上角的「打开」进入完整页面；下方仍提供适配本站目录、划词注释和导出的完整正文。
</html-embed>

<aside-note id="source-scope" kind="addon" title="资料口径">
本文沿用原始色彩手册的材料、示意图、产品案例与统计口径，资料截至 2026-08-30；Apple、Material、WCAG、色盲比例、Liquid Glass 与品牌统计等内容不在本轮联网刷新。
</aside-note>

颜色从来不是孤立存在的。一个色值单独看没有问题，放进界面却可能显脏、刺眼或看不清，问题往往不在这个颜色本身，而在它与背景、文字、强调色和显示设备之间的关系。

这篇手册从屏幕如何造出颜色讲起，逐步建立描述颜色、搭配颜色、检查无障碍和处理影像色彩的方法，最后回到一个真实界面，把问题量化并给出整改方案。

<aside-note id="relationship-thesis" kind="callout" title="全册主线" tone="thesis">
颜色的问题，从来不是哪个颜色“丑”，而是哪段关系“错”。先检查亮度、色温与层级，再讨论个人喜好。
</aside-note>

## 开篇：为什么“差不多”的两个颜色放在一起会难受

有一个 Android 应用想做“苹果式纯净风”：背景用玉白色，卡片用很浅的灰，图标用清透的浅蓝，主文字黑色、备注文字灰色。每一个颜色单独看都很正常，但真机效果完全不是那么回事：备注文字几乎看不清，浅灰卡片泛着粉肉色，冷蓝图标压在暖感灰卡上格外刺眼。

问题出在三组关系：

- **亮度关系**：备注灰和卡片底的亮度差太小。
- **色温关系**：冷蓝图标和暖感灰卡互相排斥。
- **层级关系**：卡片与背景几乎分不出谁浮在谁上面。

这本手册沿着同一条线展开：先理解屏幕如何造色，再学习描述、搭配与测量颜色的语言，最后回到这个界面逐项修复。

<aside-note id="three-color-terms" kind="addon" title="先认识三个高频词" tone="note">
**色相（Hue）**是“什么色”；**饱和度（Saturation）**是颜色有多鲜；**明度（Lightness / Value）**是颜色有多亮。任何一个颜色都能从这三个维度开始描述。
</aside-note>

## 屏幕里的颜色：色域与显示基础

### 颜色是光的“剩饭”

颜色不是物体自带的属性。白光里包含许多波段，一个红苹果吸收了其他波段，只把红色波段反射进眼睛。我们看到的颜色，是光被物体挑选之后剩下的部分。

这也解释了为什么同一件衣服在商场暖光和家中白光下看起来不同：衣服没有变，照在它身上的光谱变了。人眼能接收的波段大约是 380–780 纳米，三类视锥细胞分别对长波、中波和短波更敏感，现代颜色工程由此建立。

<aside-note id="light-terms" kind="addon" title="行话怎么说" swatch="display">
**可见光谱（Visible Spectrum）**约为 380–780nm；**视锥细胞（Cone Cells）**分 L/M/S 三类；**同色异谱（Metamerism）**指光谱不同、观感却相同。
</aside-note>

### 加色与减色：开灯与盖滤镜

屏幕像在黑屋子里开灯。红、绿、蓝三盏小灯越加越亮，全开得到白色，这就是 RGB 加色模型。印刷则像在白纸上盖滤镜，青、品红、黄油墨逐步吸收光，叠得越多越暗；现实油墨不能靠三色得到理想黑色，因此再加黑版 K，形成 CMYK 减色模型。

<compare-block id="additive-subtractive">
<compare-side role="a" title="RGB · 加色">
屏幕自发光，红绿蓝越加越亮，三通道全开得到白色。适合屏幕与发光媒介。
</compare-side>
<compare-side role="b" title="CMYK · 减色">
油墨靠吸收环境光显色，青品红黄越叠越暗，并用黑版 K 补足深黑。适合印刷。
</compare-side>
</compare-block>

屏幕能显示的电光蓝和荧光橙，油墨可能根本印不出来。因此同一个品牌色在屏幕与印刷中必须分别管理。

### 色域：屏幕有多大一盒蜡笔

RGB 不是一档色域，而是一种混色方法；sRGB、Display P3、Adobe RGB 与 Rec.2020 才是具体的色彩空间。色域可以理解为设备拥有的一盒彩笔：覆盖范围越大，能表达的颜色越多。

| 色彩空间 | 约占人眼可见色 | 典型用途 |
|---|---:|---|
| sRGB | 约 35% | 互联网与办公的默认“普通话” |
| DCI-P3 | 约 41–45% | 数字影院与移动设备广色域 |
| Adobe RGB | 约 50% | 摄影后期与印刷，青绿色范围更宽 |
| Rec.2020 | 约 75% | 4K、8K 与 HDR 的目标容器 |
| ProPhoto RGB | 约 90% | RAW 后期工作空间，通常配合高位深 |

<svg-embed id="cie-gamut" src="./media/svg/cie-gamut.svg" title="CIE 1931 色度图与常见色域示意" />

图中的马蹄形是示意，不是精确坐标。任何三原色显示器都只能在可见色区域里围出一个三角形，三角形越大，色域越广。

### 色深、Gamma 与白点

#### 色深：从黑到白切多少刀

8bit 每通道有 256 级，RGB 三通道可以组合约 1677 万色；10bit 每通道有 1024 级，可组合约 10.7 亿色。级数不足时，天空和日落的平滑渐变会被切成台阶，也就是色带。色域越大，越需要足够高的位深。

#### Gamma：暗部优先的存储策略

人眼对暗部变化更敏感。图像编码会把有限级数更多地留给暗部，显示时再按曲线恢复。sRGB 实际使用分段曲线，整体观感常用约 2.2 的 Gamma 来理解。

#### 白点与色温：白到底多暖多冷

“白”不是绝对值。屏幕常用 D65，约 6500K；印刷看样常用更暖的 D50，约 5000K。色温数值越低，光线体感越暖；越高则越冷。手机护眼模式的核心动作之一，就是降低色温。

### 色彩管理：同一张图为什么换设备就变脸

相机、屏幕和打印机都在说各自的颜色“方言”。ICC profile 是翻译表：先把文件颜色转入与设备无关的中间空间，再转换为目标设备的表达。色域不同、文件 profile 被忽略，或设备没有校准，都会造成同图不同色。专业显示器常用 ΔE 描述色差，ΔE 越小，偏差越难被察觉。

### OLED 与 LCD

LCD 依靠常亮背光和液晶遮光，黑色难免发灰；OLED 像素独立发光，显示黑色时可以直接关闭，因此黑位和对比度更好。OLED 的代价包括烧屏风险、低亮度 PWM 调光，以及近白浅灰在不同面板和亮度下的轻微漂移。

### 手机广色域：应用也要参与

广色域屏幕并不保证每个应用都正确显示广色域内容。Android 应用需要保留图片色彩空间信息，并按平台要求声明广色域能力；iOS 更倾向于系统级自动转换。手机的“鲜艳”显示模式还可能主动提高饱和度，因此判断颜色时应先确认显示模式。

## 描述颜色的语言：颜色模型

### 色彩三属性

把颜色想成一杯果汁：色相决定是什么水果，饱和度决定兑了多少水，明度决定在多亮的灯下看。三者可以独立变化，所以既可以有很艳的暗蓝，也可以有灰扑扑的浅色。

色相用角度表达：0° 红、60° 黄、120° 绿、180° 青、240° 蓝、300° 品红，360° 回到红色。

<svg-embed id="hue-wheel" src="./media/svg/hue-wheel.svg" title="色相角度的六个锚点" />

### 四组最容易混淆的词

| 易混词 | 区别 |
|---|---|
| 色温 vs 色调 | 色温是可测量的光源物理参数；色调是画面整体的色彩倾向 |
| 饱和度 vs 明度 | 饱和度管浓淡，明度管明暗 |
| 灰度 vs 灰阶 | 灰度是一种无彩色图像模式；灰阶是黑到白的级数 |
| 色彩 vs 颜色 | 基本同义，“色彩”更常见于学术与艺术语境 |

### Tint、Shade 与 Tone

- **Tint**：纯色加白，明度上升、饱和度下降。
- **Shade**：纯色加黑，明度下降。
- **Tone**：纯色加灰，饱和度下降，明度大致维持。

设计系统里的 50–900 品牌色阶，本质上就是围绕纯色建立 tint 与 shade 的梯度。

### RGB、HEX、HSL 与 HSV

HEX 只是把 RGB 三通道的 0–255 用十六进制写成 `#RRGGBB`。例如 `#3B82F6` 等于 `rgb(59, 130, 246)`；末尾再加两位可以表达透明度。

<compare-block id="hsl-hsv">
<compare-side role="a" title="HSL · 双圆锥">
L=0% 一定是黑，L=100% 一定是白，L=50% 且 S=100% 才是最纯颜色。CSS 中常用它派生 hover 和色阶。
</compare-side>
<compare-side role="b" title="HSV / HSB · 单圆锥">
V=100% 且 S=100% 才是最纯颜色；白色需要 S=0。它更接近设计软件里“加白、加黑”的调色直觉。
</compare-side>
</compare-block>

Lightroom 和达芬奇里的 HSL 曲线，本质是在特定色相范围内分别修改“它是什么色”“它有多浓”“它有多亮”，而不动其他颜色。

### 从 HSL 到 CIELAB，再到 OKLCH

HSL 的 L 只是 RGB 通道的几何计算，没有照顾人眼对绿色更敏感、对蓝色更迟钝的事实。数值同为 L=50% 的纯黄和纯蓝，看起来并不一样亮。

CIELAB 用 L\*、a\*、b\* 尝试让数值距离更接近人眼感知差异；OKLCH 则把它整理成更好用的明度 L、彩度 C、色相 H。对设计系统来说，OKLCH 更适合生成跨色相看起来仍然整齐的色阶。

### 孟塞尔：颜色公寓楼

孟塞尔系统把颜色分为 Hue、Value 和 Chroma，可以想成一栋颜色公寓：楼层是明度，离中轴的距离是彩度，绕楼一圈是色相。它不是规则球体，因为不同色相能达到的最大彩度不同，这恰好反映了真实人眼与材料世界。

### 对比度的数学

WCAG 先把 sRGB 通道线性化，再按人眼敏感度计算相对亮度：

$$
L = 0.2126R + 0.7152G + 0.0722B
$$

两种颜色的对比度为：

$$
\text{Contrast Ratio} = \frac{L_{lighter}+0.05}{L_{darker}+0.05}
$$

比值范围从 1:1 到 21:1。正文常用的 AA 参照线是 4.5:1；大文本可放宽到 3:1。

### 眼睛会骗人

同一个灰块放在黑底上显得更亮，放在白底上显得更暗，这是同时对比；均匀灰阶的边界会被看成额外亮暗条带，这是马赫带；大脑会在不同光源下主动把熟悉物体“校正”回原色，这是色彩恒常性。颜色必须放回上下文才能判断。

### 色阶与曲线

色阶工具决定黑点、白点和中间灰的位置；曲线则允许精细塑造亮度映射。S 曲线常用来提高对比度，抬黑位会制造褪色或胶片感。两者都应该先解决曝光与层次，再谈风格。

## 配色的底层逻辑

### 为什么有三套“三原色”

RYB 是传统绘画教学体系，RGB 是光的加色体系，CMYK 是印刷减色体系。它们回答的是不同媒介里的混色问题，不能互相替代。

### 补色：锋利但危险

色轮相距 180° 的两色互为补色。少量补色可以形成强烈焦点，等量、高饱和补色直接并置则可能产生视觉振动。使用补色时，应让一方主导，另一方只做强调，或通过降低饱和度、拉开明度来缓和。

### 五种经典配色公式

| 公式 | 色轮关系 | 适合的气质 |
|---|---|---|
| 单色 | 同一色相的明暗与浓淡变化 | 稳定、统一 |
| 类似色 | 色轮相邻 | 和谐、自然 |
| 互补色 | 相距 180° | 强烈、醒目 |
| 分裂互补 | 主色加补色两侧 | 有张力但较易控制 |
| 三角色 | 等距三点 | 活泼、平衡 |

### 冷暖色调

暖色容易前进，冷色容易后退。即使没有真实景深，也能靠前暖后冷制造空间；反过来，主体冷、背景暖则会产生疏离或反常感。中性色也有冷暖倾向，灰色并不真正中立。

### 60-30-10 法则

<svg-embed id="sixty-thirty-ten" src="./media/svg/color-ratio-60-30-10.svg" title="60-30-10 配色法则" />

比例说的是视觉权重，不必逐像素计算。高饱和小色块可能抵得上低饱和的大面积颜色。真正的纪律是：让大多数面积保持安静，把最醒目的颜色留给真正重要的动作。

### 色彩心理与语义色

颜色联想来自生理反应、自然经验和文化约定，不能机械套表。设计里更可靠的办法，是先定义角色，再给角色分配颜色：

| 角色 | 常见颜色 | 作用 |
|---|---|---|
| 成功 | <text-mark color="#34C759" effect="pill">绿色</text-mark> `#34C759` | 操作完成、状态正常 |
| 警告 | <text-mark color="#FF9500" effect="pill">橙色</text-mark> `#FF9500` | 需要注意但未失败 |
| 错误 | <text-mark color="#FF3B30" effect="pill">红色</text-mark> `#FF3B30` | 危险、失败、删除 |
| 信息 | <text-mark color="#007AFF" effect="pill">蓝色</text-mark> `#007AFF` | 链接、说明与主操作 |

不要只靠颜色传达状态。图标、文字和位置应共同表达含义。

## UI 里的颜色规则与无障碍

### 六条颜色规则

<inset-card id="color-rule-one" swatch="accessible" eyebrow="01" title="避开刺眼的颜色" kicker="CONTROL SATURATION">
高饱和色留给小面积强调；大面积背景先降低饱和度。
</inset-card>

<inset-card id="color-rule-two" swatch="accessible" eyebrow="02" title="探索完整色谱" kicker="EXPLORE THE SPECTRUM">
决定用蓝色不等于只选一个蓝色。先走完整条色阶，再确定明度和彩度。
</inset-card>

<inset-card id="color-rule-three" swatch="accessible" eyebrow="03" title="限制数量" kicker="LESS, BUT CLEARER">
强调色最好控制在两三种内；到处都是重点，等于没有重点。
</inset-card>

<inset-card id="color-rule-four" swatch="accessible" eyebrow="04" title="保持一致" kicker="SEMANTIC ROLES">
同一种角色始终使用同一种语义色，不要让蓝色一会儿表示链接、一会儿表示危险。
</inset-card>

<inset-card id="color-rule-five" swatch="accessible" eyebrow="05" title="平衡对比" kicker="CONTRAST, NOT EXPLOSION">
对比的目的，是让信息更清楚，而不是让页面更吵。
</inset-card>

<inset-card id="color-rule-six" swatch="accessible" eyebrow="06" title="感受颜色" kicker="CONTEXT MATTERS">
数值是检查工具，最后仍要回到真实设备、真实光线和真实使用情境中判断。
</inset-card>

### WCAG 对比度参照线

| 内容 | AA | AAA |
|---|---:|---:|
| 普通正文 | 4.5:1 | 7:1 |
| 大文本 | 3:1 | 4.5:1 |
| 关键非文本图形与控件边界 | 3:1 | — |

“刚好过线”不是理想目标。小字号抗锯齿、户外强光、OLED 低亮度与视力差异都会吃掉余量。

### 色盲与色弱

红绿色觉差异最常见。原稿记录北欧裔人群中约有男性 8%（1/12）、女性 0.5% 受红绿色觉异常影响，并提到全球约 3 亿人；这些比例是原稿截至 2026-08-30 的材料口径。对设计师来说，“用红色标错误、绿色标成功”对这部分人群等于没标。对策是绝不单独依赖颜色、优先拉开明度、避开高危组合，并让图表分类控制在 8 个以内。

Okabe-Ito 色板常被用作较稳妥的起点：<text-mark swatch="okabe-orange" effect="pill">橙</text-mark> `#E69F00`、<text-mark swatch="okabe-sky" effect="pill">天蓝</text-mark> `#56B4E9`、<text-mark swatch="okabe-teal" effect="pill">蓝绿</text-mark> `#009E73`、<text-mark swatch="okabe-yellow" effect="pill">黄</text-mark> `#F0E442`、<text-mark swatch="okabe-blue" effect="pill">蓝</text-mark> `#0072B2`、<text-mark swatch="okabe-vermilion" effect="pill">朱红</text-mark> `#D55E00`、<text-mark swatch="okabe-purple" effect="pill">红紫</text-mark> `#CC79A7` 与<text-mark swatch="okabe-black" effect="pill">黑</text-mark> `#000000`。但任何色板都不能替代实际模拟和信息冗余。

### 无障碍自查的最小流程

<timeline-block id="accessibility-check" title="交付前检查">
- **计算对比度** — 把所有文字/背景、图标/背景组合跑一遍，别只检查主标题。
- **模拟色觉差异** — 用 Chrome DevTools、Coblis 或系统色彩滤镜检查常见类型。
- **切到灰度** — 去掉颜色后，状态、层级与操作是否仍能辨认？
</timeline-block>

## 好系统怎么配色

### Apple HIG：颜色是角色

系统色不是一串固定 HEX，而是“主标签、次标签、分隔线、背景、填充”等语义角色。系统根据浅色、深色、提高对比度和不同材料自动解析实际值。组件引用角色，不直接依赖某个颜色，主题切换才不会失控。

### Material You：从种子色生成系统

Material You 从一个种子色推导多条色调板，再把色阶分配给 primary、secondary、tertiary、error、surface 等角色。它把“选几个好看的色”升级为“建立一套可以计算和约束的颜色系统”。

### 灰阶分层与玻璃拟态

一套好的灰阶不是随手写几个灰，而是让背景、卡片、弹层、分隔线、正文和次级文字各自占据稳定层级。玻璃拟态则用半透明、背景模糊和细边线表达材料关系；它需要真实背景内容作为参照，也必须实测文字对比度。

### 深色模式不是机械反色

<inset-card id="dark-rule-one" swatch="system" eyebrow="01" title="避免纯黑" kicker="BASE SURFACE">
纯黑与纯白对比过强，可能造成光晕；OLED 还可能出现滚动拖影。基础背景可从接近黑的深灰开始。
</inset-card>

<inset-card id="dark-rule-two" swatch="system" eyebrow="02" title="越高层越亮" kicker="ELEVATION">
深色背景上阴影不明显，可用逐层升高的表面明度表达海拔。
</inset-card>

<inset-card id="dark-rule-three" swatch="system" eyebrow="03" title="降低饱和度" kicker="SOFTEN CHROMA">
高饱和色在深底上容易发闪。深色模式应为品牌色准备更柔和的对应值。
</inset-card>

<inset-card id="dark-rule-four" swatch="system" eyebrow="04" title="用语义透明度分层" kicker="TEXT HIERARCHY">
高、中、低强调文字应使用稳定语义角色，而不是在每块背景上重新猜一个灰色。
</inset-card>

浅色和深色应该是两套经过设计的色板，共享语义角色，但不做简单数值反转。

## 屏幕之外：摄影、影视与 AI 视频

### 色温与白平衡

相机会忠实记录光源颜色，不会像大脑一样自动把白纸“脑补”为白。白平衡就是告诉相机现场光线的色温，让它反向补偿。烛火约 1900K，白炽灯约 2700–3200K，正午日光约 5500K，阴天和阴影常在 6000K 以上。拍 RAW 时，白平衡通常可以在后期更自由地调整。

### 橙青对比

<svg-embed id="teal-orange" src="./media/svg/teal-orange.svg" title="橙青补色如何分离肤色与背景" />

肤色通常落在橙色区间，青色与橙色接近补色，因此“阴影推青、肤色保橙”能把人物从背景中分离出来。使用时应降低风格 LUT 强度，只推阴影并保护肤色，避免把每部片都套成同一种教程味。

### 调色流程：先修，再调

<compare-block id="correction-grading">
<compare-side role="a" title="Color Correction · 校色">
先把白平衡、曝光和对比修正，让不同镜头看起来像发生在同一个世界。
</compare-side>
<compare-side role="b" title="Color Grading · 调色">
在正确基础上塑造情绪和风格，用限定器处理肤色、天空等局部区域。
</compare-side>
</compare-block>

<timeline-block id="grading-order" title="推荐顺序">
- **白平衡** — 先把光源偏色校正。
- **曝光与对比** — 找回黑点、白点和中间调。
- **一级校色** — 让镜头之间一致。
- **二级调色** — 精确处理肤色、天空或服装。
- **风格 LUT** — 最后低强度叠加，并再次检查肤色。
</timeline-block>

### 摄影用光

三点布光用主光定基调、辅光柔化阴影、轮廓光把人物从背景剥离。CTO 与 CTB 色片可以校正或故意制造冷暖差异。黄金时刻适合暖色人像，蓝调时刻则让城市灯光与深蓝天空同时成立。

### AI 视频配色

AI 视频模型更容易理解具体的影像语言，而不是“好看一点”。提示词可以按“主体与动作 → 镜头 → 光线氛围 → 胶片与调色 → 画幅”组织，并使用 `teal-and-orange grade`、`lifted blacks`、`muted film tones`、`film grain` 等各司其职的术语。一条生成最好只押一种风格。

如果要把这些术语放进完整的镜头设计，可以继续阅读站内的 [从十到一百 · AI 视频影视语言注入指南](/blog/from-ten-to-hundred-ai-video/)。

### 品牌色与照片提色板

品牌色板可从 Logo 主色出发，选择一到三种辅助色，再配中性色并按 60-30-10 分配。照片提色板不是求平均色，而是颜色量化：把相近像素聚成几组，再为每组挑代表。中位切分快而稳定，K-Means 更精细；主色不等于所有像素的平均色。

### 跨媒介一致性

屏幕、印刷和视频遵循不同物理规则，同一个色号无法走遍天下。专业品牌会同时记录 HEX、RGB、CMYK 与 Pantone 专色。目标不是让测量值完全相同，而是让识别度和情绪冲击在不同媒介中保持一致。

## 实战诊断：玄览“我的”页

### 实测数据

案例使用的主要色值是：背景 `#FFFFFF`，卡片 `#F7F7FA`，主文字 `#1C1C1E`，备注文字 `#6E6E73`，图标 `#007AFF`。

| 组合 | 实测对比度 | 参照 | 判定 |
|---|---:|---:|---|
| 主文字 `#1C1C1E` / 卡片 | 15.91:1 | AA 4.5:1 | 优秀 |
| 备注灰 `#6E6E73` / 白底 | 5.07:1 | AA 4.5:1 | 合格 |
| 备注灰 `#6E6E73` / 卡片 | 4.74:1 | AA 4.5:1 | 踩线 |
| 图标蓝 `#007AFF` / 卡片 | 3.76:1 | 非文本 3:1 | 过线但余量小 |
| 卡片 `#F7F7FA` / 白底 | 1.07:1 | 层级感知 | 几乎不可分辨 |

### 三个病因

<aside-note id="diagnosis-contrast" kind="warn" title="亮度关系：备注灰踩线" swatch="diagnosis">
4.74:1 只是在理想条件下刚过 AA。小字号抗锯齿、户外强光和低亮度显示都会进一步损失可读性。
</aside-note>

<aside-note id="diagnosis-temperature" kind="warn" title="色温关系：冷蓝与暖感灰打架" swatch="diagnosis">
高饱和冷蓝压在感知偏暖的浅灰上，冷暖与饱和度反差共同产生紧张感。
</aside-note>

<aside-note id="diagnosis-layer" kind="warn" title="层级关系：卡片与背景粘连" swatch="diagnosis">
1.07:1 几乎无法形成卡片边界。白底托浅灰卡的方向也会放大“灰卡显脏”的同时对比。
</aside-note>

此外，项目原本追求半透明、拟态与玻璃质感，最终却落成实色浅灰卡，这说明实现已经偏离自己的设计语言。

### 四步整改

<timeline-block id="color-remediation" title="从关系入手整改">
- **反转背景与卡片层级** — 背景改为 `#F2F2F7`，卡片使用 `#FFFFFF`，形成灰底托白卡。
- **加深备注文字** — `#6E6E73` 改为 `#48484A`，把卡片上的对比度提高到约 8.53:1。
- **统一中性色冷暖** — 灰阶保持轻微冷感，与品牌蓝处于同一温区。
- **逐步回归玻璃拟态** — 在性能预算内使用半透明白、背景模糊和细边线，而不是粉感实色灰。
</timeline-block>

| Token | 现状 | 建议 | 效果 |
|---|---|---|---|
| `background` | `#FFFFFF` | `#F2F2F7` | 灰底托白卡，层级反转 |
| `surfaceContainerLow` | `#F7F7FA` | `#FFFFFF` | 卡片更干净 |
| `onSurfaceVariant` | `#6E6E73` · 4.74:1 | `#48484A` · 8.53:1 | 备注清晰，余量充足 |
| `outlineVariant` | `#E5E5EA` | 维持 | 已能承担分隔角色 |
| `primary` | `#007AFF` | 维持 | 白卡上对比更稳定 |

<compare-block id="profile-before-after">
<compare-side role="bad" title="整改前">
白底 + 浅灰卡 + 踩线灰备注：层级对比只有 1.07:1，备注对比 4.74:1。
</compare-side>
<compare-side role="good" title="整改后">
灰底 + 白卡 + 加深备注：层级清晰，备注对比提高到约 8.53:1。
</compare-side>
</compare-block>

<aside-note id="diagnosis-conclusion" kind="quote" title="本章结论" tone="thesis">
把关系修对，原来的颜色大多可以继续用。
</aside-note>

## 色彩术语速查

| 中文 | 英文 | 一句话定义 |
|---|---|---|
| 色相 | Hue | 颜色是什么色，常用 0–360° 表达 |
| 饱和度 / 彩度 | Saturation / Chroma | 相对或绝对的鲜艳程度 |
| 明度 / 亮度 | Lightness / Value / Brightness | 颜色的明暗，不同模型公式不同 |
| 色域 | Color Gamut | 设备能表现的颜色范围 |
| 色彩空间 | Color Space | 一套具体颜色定义 |
| 色深 | Bit Depth | 每通道可以划分多少级 |
| Gamma | Gamma | 亮度的非线性编解码关系 |
| 白点 | White Point | 色彩空间约定的标准白 |
| ICC 特性文件 | ICC Profile | 设备颜色的“方言翻译表” |
| 补色 | Complementary Colors | 色轮相距 180° 的一对颜色 |
| 感知均匀 | Perceptually Uniform | 数值距离尽量接近视觉差异 |
| 相对亮度 | Relative Luminance | WCAG 对比度计算的基础量 |
| 语义色 | Semantic Colors | 按角色而非固定值命名的颜色 |
| 色觉缺陷 | Color Vision Deficiency | 色盲、色弱等色觉差异的统称 |
| 玻璃拟态 | Glassmorphism | 半透明、背景模糊与细边线形成的材料语言 |
| 白平衡 | White Balance | 相机对光源色温进行反向补偿 |
| 校色 / 调色 | Color Correction / Grading | 先修正确，再塑造风格 |
| LUT | Look-Up Table | 输入颜色到输出颜色的映射表 |

## 工具清单与最后五问

- **对比度**：WebAIM Contrast Checker、Colour Contrast Analyser、WhoCanUse、Stark。
- **色觉模拟**：Chrome DevTools 的 vision deficiencies、Coblis、Color Oracle，以及 Android / iOS 系统色彩滤镜。
- **配色与取色**：Adobe Color、Coolors、Material Theme Builder、Android Palette API、OKLCH Color Picker。

<timeline-block id="five-color-questions" title="每次交付前问一遍">
- **亮度关系** — 字和背景的对比度够吗？正文是否留出了高于 4.5:1 的余量？
- **色温关系** — 中性色的冷暖和强调色统一吗？
- **层级关系** — 背景、卡片和弹层能一眼分出先后吗？
- **数量关系** — 强调色超过三种了吗？是否到处都是重点？
- **人群关系** — 去掉颜色以后，信息仍然成立吗？
</timeline-block>

<aside-note id="color-closing" kind="quote" title="全册完" tone="thesis">
每一种颜色都必须挣到自己的位置。现在，你知道怎么审查它们了。
</aside-note>
