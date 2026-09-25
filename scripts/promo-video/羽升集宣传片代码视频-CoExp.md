# 羽升集宣传片代码视频 · 复盘经验总结（CoExp）

> 对象：`scripts/promo-video/out/yusheng-blog-promo.mp4`
> 规格：1920×1080 / 60fps / 30.00s / H.264 High + AAC 48kHz 立体声 / 22,600,297 字节（视频 5815 kb/s，音频 198 kb/s）/ 响度 -14.0 LUFS，峰值 -2.7 dBFS
> 源码：`composition.html`（画面）、`music.py`（配乐）、`render.mjs`（逐帧渲染 + 封装）
> 本文只写这次真实发生过的做法和问题。标着“下次”的是这次没做、但回头看应该做的改进。

---

## 一、创作思路

### 1. 需求怎么拆成叙事结构

用户的原始需求拆出来有 6 个硬约束：

| 需求原话 | 落到片子里的约束 |
|---|---|
| 大概 30s | 定死 30.00s；120 BPM 下正好 60 拍、15 小节（每小节 2s） |
| 前面温情，展示主体性 | 前 12s（6 小节，占 40%）只讲“人”，不出现博客界面 |
| 结合博客时间板块 | 单独一段 15 个月时间线（2025.07 → 2026.09） |
| 个人博客分组 | 单独一段“七卷书”（`content/sections.yml` 的 7 个 section） |
| 几个有代表性的博客内容 | 单独一段 8 张海报，每拍换一张 |
| 顶尖连贯卡点、多风格 | 12–26s 每一拍都要有一个可见动作；每段换一种视觉风格 |

然后先读素材，再定故事。读的是 `content/posts/*/index.md` 的 frontmatter（title / description / publishedAt / section / draft）、`content/sections.yml`、`content/briefs/` 的 `<title>`、`src/features/home-journey/content.ts` 的首页文案、`src/lib/theme/tokens.ts` 的配色 token，外加几篇能讲“人”的正文：《回归本真》《一份中二的自我介绍》《毕业升学 · 一寸光阴的曾经》《九月九日新的自己》《医学生转码血泪史》《从「用AI」到「理解AI」》《浅谈我关于“困难”的理解》。

从这些原文里提炼出一条线：**独处的孩子 → 被时间定格 → 给自己取名 → 把自己写成书**。每个节点都有原文可以直接引用：

- 独处：“儿时不善言辞……惯于沉浸于自己一方天地”（《回归本真》）
- 定格：倒计时 1057 天 → 0、“考试结束时间已到”、“至此，时间，永恒”（毕业信）
- 取名：“羽化成蝶方可升生不息”（《回归本真》）+ 首页 motto “羽化成蝶 升生不息”
- 双重身份：基础医学强基 / 基因工程理想（自我介绍、九月九日复盘）+ 写代码（转码复盘、课程报告）
- 写成书：“我写我零散的文字，写我零散的自己”（《回归本真》）→ 接博客本身
- 收尾：首页 narrative “把走过的路，写成可以再次抵达的光。” + 自我介绍里的“不问前程，尽管繁荣！！”

情绪 / 节奏曲线和时间段的对应：

```
能量
 ▲                    ┌──── 卡点段：每拍一动 ────┐
 │                    │  书架  时间线  海报  早报墙 │
 │               riser│                           │ 冲击
 │          羽升 ╱    │                           │╲
 │   倒计时加速 ╱     │                           │ ╲  回落
 │  ╱‾‾‾╲ ╱         ▼静默半拍                       ╲___
 │_╱ 独处                                              ╲淡出
 └──────┬──────┬──────┬──────┬──────┬──────┬──────┬────► t
        3      6      9      12     16     20     24  26  30
      温情叙事（遮幅 2.35:1）      | 卡点（满幅）              | 回落（遮幅合上）
```

实测响度也按这条曲线走（`music.py` 每秒 RMS）：0–5s 约 -21～-26 dB，6–11s 从 -17 爬到 -12，12–25s 稳在 -10 左右（大冲击拍 -7.7），27s 起 -14 → -30。

### 2. 每段的设计意图

| 时间 | 段落 | 设计意图 |
|---|---|---|
| 0–3.4s | 独处 | 用深空加金尘做“一个人的房间”，文字逐字从模糊变清晰，像回忆慢慢显影。前 0.35s 故意空着，给观众一个呼吸。 |
| 2.8–6.0s | 一寸光阴 | 暖光圆形扩成试卷纸，“光”和“纸”在同一个位置交接（匹配剪辑）。倒计时的目标原文一路从“松北九中”变到“不论”，本身就是一段成长史，不用解说。 |
| 4.8–6.0s | 时间定格 | “2025.06.09 18:15”加打字机效果的结束铃文字，再用站点正文里的荧光笔效果标出“永恒”，让视频和博客用同一种视觉语言。 |
| 5.95–9.0s | 羽化 | “永恒”两个字烧穿纸面、碎成金羽，再重组成“羽升”。这一转场把“时间定格”直接变成“新的自己”，是整条叙事线的转折点，所以做成全片最精细的粒子转场。 |
| 9.0–11.88s | 双线 | 左边医学笔记加 DNA，右边终端 `pnpm build`，用分屏讲“医学生也写代码”的双重身份。便签用站点自己的“下落便签通知”形态，撕碎之后引出“我写我零散的自己”。这句话是从“人”过渡到“书”的桥。 |
| 11.88–12.0s | 静默 | 黑屏加音乐抽空 1/4 拍，给后面的爆发蓄力。 |
| 12–16s | 七卷书 | 遮幅弹开、闪白、第一声底鼓同时落下，从“电影”切成“书”。每拍掉一本书，书的厚度按篇数定，右边计数跟着涨到 36。数据和动作绑在一起，数字才有分量。 |
| 16–20s | 时间线 | 从纸面书架甩镜到深空时间线，亮暗交替防止审美疲劳。每拍推到下一个里程碑，2026 年的描边大字在跨年那一拍闪现。 |
| 20–24s | 多风格海报 | 用户要“多风格”，又要“连贯”：每张海报一种风格（光谱 / 瑞士 / 终端 / 图示 / 胶片 / 运动曲线 / 字体标本 / 流程图），但角落都有同一套“No.xx · 分组 · 日期”元信息，而且都用同一种冲切。 |
| 24–26s | 折晓早报墙 | 从今天这一张开始，每拍拉远一级，最后是 38 张全墙。数量感靠镜头拉远来体现。最后全墙塌成一个光点，给结尾的爆发做引子。 |
| 26–30s | 羽升集 | 金光爆开之后只剩一本书和一句话，遮幅重新合上，和开头首尾呼应。声音回落到钢琴，情绪收回到“温情”。 |

### 3. 节奏、剪辑手法和音画配合

| 手法 | 用在哪里 | 为什么有效 |
|---|---|---|
| 节拍网格 | 120 BPM 下一拍 0.5s，60fps 时正好 30 帧 | 每个剪辑点都落在整数帧上，不会出现半帧误差 |
| 匹配剪辑 | 暖光 → 试卷纸，同一个中心点圆形揭开 | 观众的视线不用跳，转场是连续的 |
| 速度坡 | 倒计时翻页间隔 0.42 → 0.36 → 0.30 → 0.24 → 0.20 → 0.15 → 0.11s；滴答声间隔每次 ×0.8（最短 0.045s） | 时间越来越紧，逼近高考那一刻的压迫感 |
| 形变转场 | 粒子源取“永恒”的像素，目标取“羽升”的像素 | 两个画面有了因果关系，不只是硬切 |
| 穿越推镜 | 8.55–9.05s 放大 6 倍加 18px 模糊，同时配 whoosh | 把观众“推进”下一个场景 |
| 分屏 | 医学 / 代码 | 一个画面讲清双重身份 |
| J-cut / 先声后画 | 9.5s 起 riser，10.5s 起滚奏，比画面高潮早 1.5–2.5s | 耳朵先知道要爆发，画面爆发时情绪已经到了 |
| 静默半拍 | 11.88–12.0s 画面全黑（遮幅 540px），音乐音量压到 8% | 大多数专业卡点片都在 drop 前抽空，对比越强冲击越大 |
| 遮幅开合 | 叙事段 2.35:1（上下各 131px）；12.0s 弹开满幅；29.2s 起合上 | 画幅本身变成叙事信号：电影 → 书 → 电影 |
| 卡点冲击 | 每拍小震 7px、大冲击拍 22px，加闪白、色散、画面 punch 放大 | 画面动作和底鼓同帧，一眼就能看出卡点 |
| 甩镜转场 | 15.75s，SVG 横向模糊最高 60px，配 whoosh | 两个风格差异极大的场景之间不会割裂 |
| 冲切 | 海报每拍 1.14 → 1 缩放加 ±1.2° 微旋，首帧闪 0.35 | 8 次硬切有统一的“手感”，所以风格不同也显得连贯 |
| 阶梯拉远 | 早报墙缩放 3.3 → 2.0 → 1.3 → 0.94，每拍一级 | 用镜头运动表现“数量” |
| 首尾呼应 | 遮幅、金尘、钢琴在开头和结尾都出现 | 让片子显得完整 |

---

## 二、具体的创作方式

### 1. 技术栈与工作流

| 环节 | 工具 | 备注 |
|---|---|---|
| 画面 | 单文件 HTML + CSS + 原生 JS + Canvas 2D + 内联 SVG | 没用 GSAP / Three.js（虽然项目依赖里有）：自己写缓动，保证每一帧都是 `t` 的纯函数 |
| 字体 | npm `@fontsource/noto-serif-sc`、`@fontsource/ma-shan-zheng`、`@fontsource/jetbrains-mono` | 由本地 HTTP 服务映射到 `/fonts/<pkg>/` |
| 逐帧截图 | `playwright-core@1.56` + 预装 Chromium（`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`） | 装在 scratchpad，不进项目依赖 |
| 配乐 | Python 3.11 + `numpy` + `scipy`（`butter`/`lfilter`/`fftconvolve`），标准库 `wave` 写 WAV | 纯程序合成，没有外部音频素材 |
| 编码 | `imageio-ffmpeg` 自带的 ffmpeg 7.0.2（`/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2`） | 有 libx264 和 aac |
| 预览检查 | 同一个渲染脚本的 `--stills` 模式出 JPG，再用 ffmpeg `tile` 滤镜拼成联系表 | 用 Read 工具直接看图 |

完整步骤（按这次实际顺序）：

1. **读素材**：列出所有文章的 frontmatter，区分正式文章和草稿；读 sections、briefs、首页文案、主题 token，精读 6～7 篇正文。
2. **探环境**：`which ffmpeg node python3`、检查 numpy、Chromium 路径、中文字体、外网可达性（个人站和 GitHub raw 都被挡）。
3. **定结构**：三幕、节拍网格、9 个镜头的起止时间。
4. **先写配乐**（`music.py`）：时间点写死在音频里，画面去对齐音频，而不是反过来。
5. **写画面**（`composition.html`）：数据常量 → DOM 构建 → 粒子 → 9 个 scene 函数 → 全局镜头语言 → `__ready` 启动。
6. **写渲染器**（`render.mjs`）：静态服务 + Playwright + ffmpeg 管道，支持 `--stills`。
7. **抽静帧检查**：一共 4 轮联系表（第一幕 / 第二幕前半 / 海报加早报加结尾 / 边界帧），每轮修一批问题。
8. **全片渲染**：约 4 分钟出 1800 帧。
9. **体积和响度处理**：第一版 88MB，压到 22.6MB；响度统一到 -14 LUFS。
10. **成片抽帧复查**：每 2.5s 抽一帧拼表，又发现一处叠画，修完后重渲全片。
11. **提交**：`eslint scripts/promo-video` 通过，commit message 写在 `.tmp/commit-msg.txt` 里用 `git commit -F`，推到分支。

### 2. 项目结构、关键模块和核心代码

```
scripts/promo-video/
├── composition.html   画面：CSS token + 9 个 <section class="scene"> + 全局层（fx 画布/闪白/暗角/颗粒/遮幅）
├── music.py           配乐：乐器函数 → 和声 → 编曲 → 混音
├── render.mjs         渲染：静态服务 → Chromium → 逐帧截图 → ffmpeg
├── README.md          分镜表 + 渲染命令
├── .gitignore         out/* 只放行成片 mp4
└── out/
    ├── music.wav              （不提交，随时可以重新生成）
    └── yusheng-blog-promo.mp4 （提交）
```

**核心思想：画面是时间的纯函数。** `window.__render(t, frame)` 根据 `t` 算出所有元素的状态，不依赖上一帧。随机数全部用带种子的 mulberry32，颗粒噪点用 `frame` 做种子。这样任意一帧都能单独重渲，抽静帧和全片渲染的结果完全一致。

场景调度（时间区间允许重叠，重叠部分就是转场区）：

```js
const SCENES = {
  s1: [0, 3.45], s2: [2.8, 6.7], s3: [5.95, 9.05], s4: [9.0, 11.88],
  s5: [12.0, 16.1], s6: [15.85, 20.0], s7: [20.0, 24.0], s8: [24.0, 26.0], s9: [26.0, 30.1],
}
function render(t, frame = Math.round(t * 60)) {
  for (const [id, [a, b]] of Object.entries(SCENES)) {
    const on = t >= a && t < b
    const s = document.getElementById(id)
    s.style.display = on ? 'block' : 'none'
    if (on) SCENE_FN[id](t)
  }
  // …画布、镜头震动、闪白、遮幅、颗粒
}
```

缓动直接用站点的 token（`--ease-damp` / `--ease-pop`），用牛顿迭代解 cubic-bezier：

```js
function bez(x1, y1, x2, y2) {
  return (x) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let u = x
    for (let i = 0; i < 10; i++) {
      const fx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - x
      const d = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u
      if (Math.abs(d) < 1e-6) break
      u = cl(u - fx / d)
    }
    return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3
  }
}
const damp = bez(0.22, 0.82, 0.28, 1)   // --ease-damp
const pop = bez(0.34, 1.22, 0.42, 1)    // --ease-pop
const P = (t, a, b) => cl((t - a) / (b - a))   // 区间进度，所有动画都用它
```

逐字揭示（全片所有“文字浮现”都走这一个函数）：

```js
function reveal(chars, t, start, stagger, dur, dy = 22, blur = 14) {
  chars.forEach((c, i) => {
    const p = damp(P(t, start + i * stagger, start + i * stagger + dur))
    tf(c, { y: (1 - p) * dy, o: p, blur: (1 - p) * blur })
  })
}
```

卡点包络（震动、闪白、色散共用同一套逻辑）：

```js
const BEATS = []; for (let b = 12.0; b < 26; b += 0.5) BEATS.push(b); BEATS.push(26.0)
const BIG = [12.0, 16.0, 20.0, 24.0, 26.0]
function beatEnv(t, list, decay) {
  let v = 0
  for (const b of list) if (t >= b && t - b < decay * 6) v = Math.max(v, Math.exp(-(t - b) / decay))
  return v
}
const small = t >= 12 && t < 26.2 ? beatEnv(t, BEATS, 0.06) : 0
const big = beatEnv(t, BIG, 0.09)
const amp = small * 7 + big * 22                     // 震动像素
cam.style.transform = `translate(${(r() - 0.5) * amp}px, ${(r() - 0.5) * amp}px) scale(${1 + big * 0.035 + small * 0.012})`
const ab = big * 10 + small * 3                      // 色散像素
filters.push(`drop-shadow(${ab}px 0 0 rgba(255,40,60,.45)) drop-shadow(${-ab}px 0 0 rgba(40,220,255,.45))`)
```

文字粒子形变（“永恒” → “羽升”）：先在离屏画布上用同一字体画字，再按步长采样不透明像素：

```js
function sampleText(text, font, cx, cy, step) {
  const c = document.createElement('canvas'); c.width = 1920; c.height = 1080
  const x = c.getContext('2d')
  x.font = font; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText(text, cx, cy)
  const d = x.getImageData(0, 0, 1920, 1080).data, pts = []
  for (let y = 0; y < 1080; y += step) for (let xx = 0; xx < 1920; xx += step)
    if (d[(y * 1920 + xx) * 4 + 3] > 140) pts.push([xx, y])
  return pts
}
// 源点用 getBoundingClientRect 取「永恒」的真实屏幕位置，步长 3；目标「羽升」步长 5；共 2200 片
// 每片走三次贝塞尔：源 → 源上方随机 200～650px → 目标附近 ±350px → 目标，延迟 0～0.38s，时长 1.25s
```

启动流程（字体加载是否完整决定了画面对不对）：

```js
window.__ready = (async () => {
  const all = document.body.innerText + MILESTONES.flat().join('') + BRIEFS.flat().join('') + '…'
  await Promise.all(FONT_SPECS.map((f) => document.fonts.load(f, all)))   // 按全部文字拉取 unicode-range 切片
  for (const id of Object.keys(SCENES)) document.getElementById(id).style.display = 'block'
  document.querySelectorAll('.poster').forEach((p) => (p.style.display = 'block'))
  await document.fonts.ready
  // 所有场景都可见时才能量真实宽度（流程图节点排版）
  // 然后只显示 s2/s3，取「永恒」的位置，生成粒子
  buildFeathers()
  render(0)
})()
```

### 3. 每种视觉风格的代码实现

| 风格 | 场景 | 实现要点 |
|---|---|---|
| 电影胶片 | 全片 | 遮幅用上下两个黑 `div`，高度 131px（2.35:1）；颗粒是 480×270 的画布，每帧按种子填随机灰度，拉伸到全屏，`mix-blend-mode: overlay`，透明度 0.3 / 0.18 / 0.28 三档；暗角是径向渐变；遮幅上放场记文字和 `00:ss:ff` 时间码 |
| 深空金尘 | S1 / S3 / S9 | 170 颗尘埃，位置是 `t` 的函数：`x0 + vx*t + sin(t*0.7+ph)*18`，取模回绕；闪烁是 `sin²` |
| 试卷纸 | S2 | `repeating-linear-gradient(0deg, transparent 0 55px, rgba(185,174,146,.45) 55px 57px)` 画横线，加一条红色竖线当页边 |
| 光 → 纸揭开 | S2 入场 | `clip-path: circle(${open*1200}px at 960px 560px)` |
| 荧光笔 | “永恒” | `.mark::before` 画一条底色，`transform: scaleX(var(--m)) skewX(-12deg)`，JS 只改 `--m` |
| 打字机 | 结束铃、终端 | 按 `P(t)` 截取子串，末尾拼 `▍`，按 `floor(t*8)%2` 闪烁；终端行先去掉 HTML 标签再截取，打完再换回带颜色的 HTML |
| 烧穿 | S2 → S3 | 纸面加 `mask-image: radial-gradient(circle at 永恒中心, transparent r, #000 r+40px)`，r 从 20 涨到 1520；画布上同步画一圈橙金渐变火边 |
| 金色书法字 | 羽升 | Ma Shan Zheng 400px，`background: linear-gradient(...)` 加 `background-clip: text`，外面套 `drop-shadow` 发光；扫光是同一行字叠一层白色斜渐变，移动 `background-position` |
| 分屏 | S4 | 两个 960px 宽的面板用 `translateX` 从两侧滑入，再向两侧拉开；中缝是一条发光竖线 |
| DNA 描线 | S4 左 | SVG path 用正弦采样生成两条链加横档，`strokeDasharray = getTotalLength()`，动画只改 `strokeDashoffset` |
| 下落便签 + 撕碎 | S4 | 下落用 `-700 + 700*(1-(1-p)^3)`，加 `sin(t*5)*3°` 的摆动；撕碎是 18 块 `clip-path` 随机多边形碎片，做抛物线运动（`vy*p + 1400*p²`）同时旋转、淡出 |
| 书架 | S5 | 书脊用四段 `linear-gradient` 加内阴影做出圆脊；书名 `writing-mode: vertical-rl`；每本书在拍点前 0.2s 开始 `quadIn` 下落，落地后 `sin(πp)*0.06` 的压扁回弹；画布画落地扬尘 |
| 时间线 | S6 | 整条轨道一个 `div`，`translateX(960 - camX)`；每拍用 `expoOut` 花 0.36s 推到下一个节点；卡片用 `pop` 从 0.55 缩放到 1；节点光环是 `box-shadow` 扩散；背景年份用描边空心大字（`-webkit-text-stroke`） |
| 光谱 | 海报 1 | 三个 `mix-blend-mode: screen` 的红绿蓝圆盘向中间汇合成白色；色环是 `conic-gradient` 加 `mask` 挖空 |
| 瑞士 | 海报 2 | 等宽数字“里程表”：每一位是一列 0–9 重复 n 次的竖条，整列 `translateY(-330*n*p)`，保证 `n % 10` 等于目标数字 |
| 终端数据 | 海报 3 | 背景是滚动的假日志；数字 0 → 22% 计数；40 格进度条点亮 `round(40*0.22*p)` 格 |
| 图示 | 海报 4 | SVG 连线从起点插值到终点；Agent 节点用 `pop` 放大；4 个标签绕圆周漂动 |
| 胶片条 | 海报 5 | 片孔是 `repeating-linear-gradient`，整条胶片 `translateX(-1500*lt)` |
| 运动曲线 | 海报 6 | 画布画三次贝塞尔曲线（先描线再走点），带 7 个残影点和控制柄 |
| 字体标本 | 海报 7 | 48 个术语按随机速度横向穿屏，标题带 `skewX` 冲击 |
| 流程图 | 海报 8 | 5 个节点等所有场景可见后用 `offsetWidth` 量真实宽度，再居中排版；节点每 0.07s 出现一个，箭头 `scaleX` 伸出 |
| 报纸墙 | S8 | 8 列网格放 38 张卡片；镜头按 4 级缩放数组插值；卡片按离“今天”那张的距离依次 `rotateX(-90° → 0)` 翻入；结尾整墙缩小、旋转、模糊，塌成一个光点 |
| 3D 书 | S9 | `transform-style: preserve-3d`，封面在原位，书脊 `rotateY(-90deg)`，书页 `rotateY(90deg)`；整本书 `rotateY` 从 -48° 转到 -16°；画布画 3 圈金色冲击环和 260 颗向外爆开的粒子 |
| 甩镜模糊 | S5 → S6 | SVG `<feGaussianBlur stdDeviation="X 0">` 只做横向模糊，每帧改 X，`cam.style.filter = 'url(#hb)'` |

### 4. 音频处理

**全部程序合成**，48kHz，`music.py` 一次运行约 4 秒出 `out/music.wav`。

- **和声**：D 大调。叙事段按小节走 Dmaj7 → Bm7 → Gmaj7 → A7 → Dmaj7 → Gmaj7 → Asus（最后两个各 1s，加快推进）；卡点段 Dmaj7 → Bm7 → Gmaj7 → A7 → Dmaj7 → Bm7 → Gmaj7 → A7；结尾 Dadd9。
- **乐器**（全部是函数，返回 numpy 数组）：
  - `piano`：7 次谐波，每次谐波衰减更快，带一点非谐性，4ms 起音
  - `pad`：每个音 3 根失谐锯齿波（±0.6%），2 阶低通，0.6s 起音
  - `bell`：非整数倍泛音 1 / 2.76 / 5.4 / 8.93
  - `kick`：正弦扫频 `46 + 130·e^(-t/0.035)` Hz，加 2kHz 高通噪声“点击”，再过 tanh
  - `clap`：900–5000Hz 带通噪声，3 次间隔 11ms 的包络叠加
  - `hat`：7.5kHz 高通噪声，15ms 衰减
  - `snare`、`tick`（3.1k + 5.2k 正弦）、`crash`、`boom`（38Hz 低频）、`riser`（带通频率随时间扫高，加正弦音高上升 2.5 个八度）、`whoosh`、`shimmer`
- **编排**：用 `place(bus, 信号, 起始秒, 增益)` 把事件放到时间轴上，时间点和画面常量一一对应：
  - 0.35 / 1.35 / 2.35s 三个旋律音
  - 3.0–4.8s 滴答间隔 0.22s、每次 ×0.8
  - 4.8s 和 5.2s 钟声
  - 5.9s shimmer，6.0s 低频 boom，7.8s 钟声（扫光）
  - 8.6s whoosh（穿越推镜）
  - 9.5s riser 2.4s，10.5s 起滚奏（间隔 0.25s、每次 ×0.82，最短 1/16 拍），11.4s whoosh
  - 12–25.5s 每拍底鼓，偶数拍拍手，反拍踩镲；20s 起加 16 分踩镲；23.5s 起 4 下 16 分军鼓加花
  - 12 / 16 / 20 / 24s crash + boom；15.72 / 19.72s whoosh（甩镜提前约 0.03s 起）
  - 24.5s 第二次 riser；26s 长底鼓 + boom + crash，Dadd9 琶音间隔 0.16s
- **侧链泵感**：每个底鼓位置把包络压到 0.25，0.32s 内按 `0.25 + 0.75·(t/0.32)^0.6` 恢复，乘到贝斯、pluck 和 12s 之后的 pad 上。
- **混响**：2.2s 指数衰减噪声当 IR（τ=0.55s，5kHz 低通，能量归一化），`fftconvolve` 卷积；右声道错开 190 / 240 个采样做宽度。
- **分段电平**（关键修复，见坑 7）：`bus = np.interp(t, [0, 8.8, 11.8, 12.0, 30], [0.5, 0.55, 0.85, 1.0, 1.0])` 乘到温情总线上；fx 总线 0–9s 为 0.7。
- **静默 / 淡入淡出**：11.88–12.0s 整体乘 0.08；开头 0.3s 淡入；结尾 `((30-t)/1.6)^1.5` 淡出；最后 `tanh(x*0.9)` 软限幅，峰值归一到 0.89。
- **成片响度**：封装时 `-af volume=-3dB`，从约 -11 LUFS 降到 -14.0 LUFS，峰值 -2.7 dBFS。
- **检查方法**：因为没法听，我用 `ffmpeg -af ebur128=framelog=quiet:peak=true` 量整体响度和峰值，再用 numpy 按秒算 RMS 看“温情段轻、卡点段重”的曲线对不对。**这只能证明电平正确，不能证明好听，交付时一定要请人实际听一遍。**

### 5. 渲染与导出命令和参数

依赖安装（全部在 scratchpad，不改项目 `package.json`）：

```bash
S=<scratchpad>
cd $S && npm init -y && npm i playwright-core@1.56 \
  @fontsource/noto-serif-sc @fontsource/ma-shan-zheng @fontsource/jetbrains-mono
pip install numpy scipy imageio-ffmpeg
FF=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2
```

生成音频、抽静帧、出全片：

```bash
cd scripts/promo-video
python3 music.py out/music.wav
PROMO_DEPS=$S node render.mjs --out $S/render/x.mp4 --stills 4.85,4.95,5.05,5.2   # 静帧
PROMO_DEPS=$S FFMPEG=$FF node render.mjs --out out/yusheng-blog-promo.mp4          # 全片
```

`render.mjs` 里的关键参数：

```js
chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'] })
browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
// 每帧：page.evaluate(__render(i/60, i)) → page.screenshot({ type: 'jpeg', quality: 94 }) → 写进 ffmpeg stdin
```

```bash
ffmpeg -y -f image2pipe -framerate 60 -c:v mjpeg -i - -i out/music.wav \
  -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 6M -maxrate 8M -bufsize 16M -pix_fmt yuv420p -profile:v high \
  -movflags +faststart \
  -af volume=-3dB -c:a aac -b:a 192k -ar 48000 \
  -t 30 out/yusheng-blog-promo.mp4
```

- `yuv420p` 加 `high` profile：所有播放器和平台都能放
- `+faststart`：moov 放到文件头，网页里边下边播
- `-t 30`：强制时长等于音频，避免多一帧或少一帧
- 控制体积：颗粒噪点每帧都变，基本压不动。第一版用 `-crf 18` 实际跑到 23 Mbps / 88MB；改成固定码率 6M 后是 22.6MB。估算公式：`体积 ≈ (视频码率 + 音频码率) × 时长 / 8`，即 (5.8 + 0.2) Mbps × 30s / 8 ≈ 22.5MB

检查命令：

```bash
$FF -hide_banner -i out/yusheng-blog-promo.mp4                                  # 时长/分辨率/帧率/码率
$FF -hide_banner -i out/yusheng-blog-promo.mp4 -af ebur128=framelog=quiet:peak=true -f null - 2>&1 | grep -E " I:|Peak:"
$FF -y -ss 1.25 -i out/yusheng-blog-promo.mp4 -vf "fps=0.4,scale=640:-1,tile=4x3:padding=6" -frames:v 1 sheet.jpg   # 成片联系表
$FF -y -pattern_type glob -i 't*.jpg' -vf "scale=640:-1,tile=3x4:padding=6" -frames:v 1 sheet.jpg                    # 静帧联系表
```

### 6. 时间分配与提速

按文件时间戳和日志估算（开工阶段没留时间戳，只能粗估）：

| 环节 | 大致耗时 | 说明 |
|---|---|---|
| 读项目素材、定叙事 | 约 25% | 读 73 篇 frontmatter、7 篇正文、token、首页文案 |
| 探环境、装依赖 | 约 10% | 外网被挡、GitHub raw 403、找 ffmpeg，走了几步弯路 |
| 写配乐 + 调电平 | 约 10% | 合成本身 4 秒，主要时间花在写代码和第一次电平失衡 |
| 写画面合成页 | 约 25% | 约 1200 行，一次写完 |
| 静帧检查和修改（4 轮） | 约 15% | 每轮出 11～12 张静帧约 20 秒，看图和改代码占大头 |
| 全片渲染 ×2 | 约 10% | 每次约 4 分钟（约 7.5 fps，日志 60 帧 / 8 秒） |
| 压缩、响度、提交 | 约 5% | 包括一次多余的二次压缩 |

最耗时的是**读素材**和**全片渲染**，最浪费的是**做了两次全片渲染 + 一次二次压缩**。

提速做法（下次）：

1. **第一次全片就用最终编码参数**（`-b:v 6M`），不要先 `-crf 18` 再压。这次多花了约 6 分钟，还有一轮画质损失。
2. **多进程分段渲染**：开 4 个 Chromium 页面，按帧区间 [0,450) [450,900)…分别渲染成片段，最后用 `ffmpeg -f concat` 拼接。因为画面是纯函数，天然可以并行，大约能快 3～4 倍。
3. **草稿用 30fps、960×540**，定稿再上 60fps、1080p。
4. **颗粒每 2～3 帧才更新一次**，或者降低强度：既省码率，也更像真实胶片的颗粒节奏。
5. **静帧一定要抽转场边界**（每个转场的起点、中点、终点），这样叠画问题在静帧阶段就能发现，不用等到成片（见坑 18）。
6. **音画时间点放在同一个 JSON 里**，`music.py` 和 `composition.html` 都从这里读，不用在两处手工同步。

---

## 三、注意事项与踩过的坑

### 1. 可逐项打勾的清单

**开工前**

- [ ] 确认时长、分辨率、帧率、交付格式、体积上限（这次仓库单文件上限是 25MB）
- [ ] 选 BPM，让一拍正好是整数帧：120 BPM 在 30fps 和 60fps 下都是整数帧
- [ ] 列出所有素材，**分清正式内容和测试 / 草稿**（`draft: true`、`p0-kitchen-sink` 这类）
- [ ] 用脚本数清楚每一个会上屏的数字（篇数、份数、月数），不要用 `ls | wc -l` 这种会把目录名、空行也算进去的方法
- [ ] 探测环境：`which ffmpeg`、`ffmpeg -encoders | grep -E "264|aac"`、`ffmpeg -filters | grep drawtext`、Chromium 路径、Python 包、npm 能不能装包
- [ ] 探测外网：用户给的参考网站、字体 CDN、GitHub raw 是否可达，不可达就提前定替代方案
- [ ] 确认字体来源和许可（这次用 @fontsource 的 OFL 字体）
- [ ] 读项目规则（AGENTS.md）：依赖能不能加、临时文件放哪、commit 格式、能不能推送

**制作中**

- [ ] 先写音频、定时间点，画面去对齐音频
- [ ] 所有动画只依赖 `t`；随机数全部带种子
- [ ] 字体加载完再截图：所有场景临时设成 `display:block`，`document.fonts.load(font, 全部文字)`，再 `await document.fonts.ready`
- [ ] 依赖布局的计算（元素宽度、文字屏幕位置）必须在字体加载后、元素可见时做
- [ ] 遮幅期间的内容放在安全区里（上下各留出 131px 以上，再多留 40px 余量）
- [ ] 每段动画时长不能超过它所在的拍长（海报每张只有 0.5s）
- [ ] 用脚本批量改源码时，确认锚点字符串只出现一次（`assert s.count(a) == 1`）
- [ ] 每改一批，就抽**转场边界帧**拼联系表检查

**导出前**

- [ ] 静帧覆盖每个场景的入场、中段、出场，以及每个转场的重叠区
- [ ] 数字、文案和源素材逐字核对（日期、标题、数量）
- [ ] 响度：整体约 -14 LUFS，峰值不高于 -1 dBFS；分段 RMS 符合情绪曲线
- [ ] 编码参数一次定好：`libx264 yuv420p high +faststart`，码率按体积上限反推
- [ ] `-t` 锁定时长，和音频长度一致

**交付前**

- [ ] `ffmpeg -i` 核对时长、分辨率、帧率、音视频两路流
- [ ] 体积低于上限
- [ ] 成片每 2.5s 抽一帧拼表复查（不要只看源码渲染的静帧）
- [ ] 请人真的听一遍、看一遍（AI 听不到声音，也看不到连续运动）
- [ ] 渲染依赖和命令写进 README，保证别人能复现
- [ ] 如实说明做不到、没做、存疑的地方（这次：个人介绍站没看到、没有听音频、没写网址）

### 2. 踩过的坑

| # | 现象 | 根本原因 | 解决 | 下次怎么避免 |
|---|---|---|---|---|
| 1 | 访问 `yusheng.husteread.icu` 时 curl 报 `CONNECT tunnel failed, response 403`，WebFetch 报 `EGRESS_BLOCKED` | 云环境的网络策略不允许访问这个域名 | 改用博客里的自我介绍、首页文案和课程报告来还原人物，并在交付时说明 | 开工时先测所有外部参考链接；不可达就请用户贴内容或截图 |
| 2 | 从 GitHub raw 下载 Noto Serif SC、马善政、JetBrains Mono 全部 403，下到的是 378 字节的错误页 | 同上，GitHub raw 被挡；而且 curl 没加 `-f`，不会报错 | 改用 npm 的 `@fontsource/*`（npm 源可达），自带 `unicode-range` 切片 CSS | 字体优先走 npm @fontsource；下载后检查文件大小，curl 加 `-f` |
| 3 | `import numpy` 报 ModuleNotFoundError；后面 scipy 也没有 | 环境没预装 | `pip install numpy imageio-ffmpeg`，后来又装了 `scipy` | 开工时一次性检查、一次性装齐 |
| 4 | 系统里没有 `ffmpeg`；Playwright 自带的 `ffmpeg-1011` 只有 vp8 编码器，没有 libx264 | Playwright 那个 ffmpeg 是给录屏用的精简版 | 用 `imageio-ffmpeg` 自带的 ffmpeg 7.0.2（有 libx264 和 aac） | 先跑 `ffmpeg -encoders | grep -E "264|aac"` 确认编码器 |
| 5 | 用 ffmpeg 拼联系表时报 `No such filter: 'drawtext'` | 这个 ffmpeg 没编进 libfreetype | 去掉时间标签，只用 `tile`，靠文件名顺序对应时间 | 需要叠字时，在 HTML 里自己画时间码，或先检查滤镜列表 |
| 6 | 项目没有 `node_modules`，Playwright 不能直接用 | 仓库是新克隆的；而且按项目规则加依赖要先问 | 把 `playwright-core` 装在 scratchpad，渲染器用 `createRequire(PROMO_DEPS)` 加载，`executablePath` 指向预装 Chromium | 视频工具链和项目依赖隔离，用环境变量指路径 |
| 7 | 第一版配乐 -8.2 LUFS，温情段每秒 RMS（-9～-13 dB）和卡点段（-8 dB）几乎一样响，没有起伏 | pad 的锯齿波能量大，混响又叠加，tanh 驱动 1.25 把整体压扁了 | 加分段总线自动化 `[0.5, 0.55, 0.85, 1.0]`，fx 总线前段 0.7，tanh 驱动降到 0.9 → 前段 -21～-26 dB、卡点 -10 dB，整体 -11.1 LUFS | 合成完先按秒量 RMS，对照情绪曲线再调 |
| 8 | 差点把篇数写成 37、早报写成 41 | 37 篇里有一篇 `p0-kitchen-sink` 是验收测试文章；41 是 `ls content/briefs/*/ | wc -l` 把目录名和空行也算进去了，实际 HTML 只有 38 个 | 按 section 逐个统计得到 36；用循环逐个读 `<title>` 得到 38。另外：交付说明里把草稿数写成了 35，复盘时用 `grep -l "^draft: true"` 复核，实际是 36（73 = 37 + 36） | 上屏数字一律用精确脚本统计，并且对照具体条目列表复核 |
| 9 | 担心 `display:none` 场景里的中文字体没加载，截图出现系统字体或方块 | Chromium 只为渲染出来的文字拉取 `unicode-range` 切片 | `__ready` 里把所有场景设为可见，用 `document.fonts.load(字体, 全部文字)`，再 `await document.fonts.ready` | 把这段做成模板代码的必备步骤 |
| 10 | 粒子形变需要“永恒”两个字的真实屏幕坐标 | 文字位置由 CSS 布局决定，JS 没法事先知道 | 启动时只显示 s2/s3，清掉 clip-path 和缩放，用 `getBoundingClientRect` 取坐标，再用同一字体在离屏画布上采样 | 所有依赖布局的数据都在“字体加载完、变换复位”后测量 |
| 11 | 流程图布局代码被插进了两个位置；而且量出来的 `offsetWidth` 是 0 | ① Python `str.replace` 会替换**所有**匹配，锚点 `const yh = …getBoundingClientRect()` 在 `buildFeathers` 和 `__ready` 里各有一处；② 代码插在隐藏其它场景之后，海报已经 `display:none` | 把代码块挪到 `fonts.ready` 之后、所有场景可见时执行，用 `sed` 删掉重复的那份 | 批量改源码前 `assert s.count(anchor) == 1`；测量代码放在“全部可见”阶段 |
| 12 | 写成了 `S5 = {…}` 加 `var S5` 这种靠变量提升的写法 | 手写时顺序颠倒 | 改成 `const S5 = { books: [] }` | 写完后跑一遍 ESLint 或自检 |
| 13 | 版本号海报的里程表最后停在 “0.7.3…”，不是 “0.1.1001”；最后几位在 0.5s 内也滚不完 | ① 滚动圈数写成 `n = 10 + 数字 + i*3`，最后停在 `n % 10`，不等于目标数字；② 时长 `0.34 + 0.025×7 = 0.515s`，超过 0.5s 拍长 | `n = 10*(1 + i%3) + 数字`；时长改成 `0.26 + i*0.018` | 滚动类动画断言终值；所有动画结束时间必须早于镜头结束 |
| 14 | 流程图箭头和节点对不齐 | 节点宽度按“字数 × 34px”估算，和实际渲染宽度差很多 | 字体加载后用 `offsetWidth` 量真实宽度，再按总宽度居中 | 不估算文字宽度，一律实测 |
| 15 | S4 左上角的 “NOTE · 基础医学强基 2501” 和终端的三个圆点被上方遮幅挡住 | 内容放在 top 120–130px，而遮幅高 131px | 整体下移约 50px（标题 178px、终端 240px） | 遮幅场景定义安全区常量，所有内容限制在里面 |
| 16 | 第一幕的纸面颗粒太重，像脏污 | overlay 颗粒透明度 0.42 在浅色背景上特别明显 | 三档调成 0.3 / 0.18 / 0.28 | 颗粒强度按背景明暗分开调 |
| 17 | 结尾书封上的“羽升集”压住了底部“卷一 长文…”那行字 | 竖排 150px 三个字总高度超过封面可用高度 | 字号 150 → 128，top 90 → 70 | 竖排文字按“字数 × 字号”核算高度 |
| 18 | 成片抽帧时发现约 5.0s 处倒计时的“0”和“2025.06.09 18:15”叠在一起，画面很脏 | 倒计时淡出（4.95–5.3）和日期淡入（4.95–5.35）完全重叠；静帧抽的是 4.2 和 5.2，正好错过这个区间 | 改成先后衔接：“0”在 4.88–5.04 放大冲出（expoIn），日期在 5.02–5.38 进入；抽 4.85 / 4.95 / 5.05 / 5.2 四帧确认后重渲全片 | 静帧必须覆盖每个转场的起点、中点、终点；交叉淡化只用于同一种风格的元素之间 |
| 19 | 第一版成片 87,958,313 字节（23 Mbps），超过 25MB 上限 | `-crf 18` 加上每帧都变的全屏颗粒，编码器必须保留噪点细节，码率失控 | 先对成片二次压缩到 6M（有画质损失），修完叠画后直接用 `-b:v 6M -maxrate 8M -bufsize 16M` 从原始帧重渲 → 22.6MB | 有体积上限时从一开始就用固定码率；颗粒降频或减弱 |
| 20 | 单遍 `loudnorm=I=-14` 实测是 -11.9 LUFS，没达到目标 | 单遍 loudnorm 是动态模式，对短而动态大的音乐不准 | 实测 WAV 是 -11.1 LUFS，直接用静态增益 `volume=-3dB` → -14.0 LUFS，峰值 -2.7 | 用 `ebur128` 先测，再用静态增益；要用 loudnorm 就做两遍 |
| 21 | 用 `sleep 45; cat log` 等渲染，被环境拦截 | 这个环境禁止前台长时间 sleep | 渲染用 `run_in_background` 跑，另开一个 `until grep -qE "wrote|Error|exit" log; do sleep 5; done` 等结束 | 长任务一律后台跑，用 until 循环同时匹配成功和失败两种结果 |
| 22 | 渲染日志里一直有 `Failed to load resource: 404` | 浏览器请求 `/favicon.ico`，本地服务没有这个文件 | 没影响，未处理 | 服务里给 favicon 返回 204，免得和真正的资源丢失混在一起 |
| 23 | 甩镜转场中间那 2～3 帧是一片灰蒙蒙的 | 60px 横向模糊 + 色散 + 颗粒叠加，把画面搅成了中性灰 | 帧数很少，这次接受了 | 甩镜中段把颗粒透明度降到 0，色散只在进出两端出现 |
| 24 | 音频的剪辑时间点在 `music.py` 和 `composition.html` 各写了一份 | 两个文件是分开写的 | 手工逐项对齐（例如 8.6s 的 whoosh 是后来补进 music.py 的） | 共享一个 `timeline.json`，两边都从这里读 |
| 25 | 没法确认配乐“好不好听” | AI 听不到声音，只能测电平 | 用 RMS 曲线和 LUFS 验证电平与结构，交付时明确说明需要人工试听 | 把“人工试听”写进交付清单 |

---

## 四、可复用的模板

### 1. 代码视频制作流程模板

```
<project>/scripts/<video-name>/
├── timeline.json      # 唯一的时间来源：BPM、时长、scenes、beats、big hits、cues
├── music.py           # 读 timeline.json → out/music.wav
├── composition.html   # 读 timeline.json → window.__ready / window.__render(t, frame)
├── render.mjs         # 本地静态服务 + Chromium 逐帧截图 + ffmpeg；--stills / --fps / --range
├── README.md          # 分镜表 + 复现命令
├── .gitignore         # out/*，只放行成片
└── out/
```

**阶段 0 · 规格（10 分钟）**
1. 时长 D、分辨率、帧率 F、体积上限 L → 视频码率 ≈ `L×8/D − 0.2` Mbps（留 10% 余量）
2. BPM：让 `60/BPM × F` 是整数（120 BPM 配 30/60fps）
3. 探测环境：ffmpeg 编码器、drawtext、Chromium 路径、Python 包、npm、外网

**阶段 1 · 素材与叙事（25%）**
1. 用脚本列出所有素材元数据，排除草稿和测试内容，精确统计会上屏的数字
2. 精读能体现“人”的原文，摘出 6～10 句可以直接引用的话
3. 画情绪曲线 → 分幕 → 每幕按小节切镜头；给每个镜头写“意图 / 画面 / 剪辑手法 / 音效”四栏表

**阶段 2 · 音频先行（10%）**
1. 写乐器函数 → 和声进行 → `place()` 编排 → 侧链 → 混响 → 分段电平 → 软限幅
2. 按秒量 RMS，对照情绪曲线；用 ebur128 量 LUFS 和峰值

**阶段 3 · 画面（25%）**
1. CSS token（从项目主题里取）→ 场景 DOM → 数据常量 → 构建函数
2. 工具函数：`P / bez / damp / pop / expoOut / rng / tf / splitChars / reveal / beatEnv`
3. 每个场景写一个 `sceneX(t)`；全局层：画布、震动、闪白、色散、遮幅、颗粒、暗角
4. `__ready`：字体全量加载 → 全部可见时测量布局 → 生成粒子 → `render(0)`

**阶段 4 · 检查（15%）**
1. `--stills`：每个场景的入场 / 中段 / 出场，每个转场的起点 / 中点 / 终点
2. ffmpeg `tile` 拼联系表 → 看图 → 修 → 重抽

**阶段 5 · 出片（15%）**
1. 草稿：30fps、960×540、4 进程分段渲染
2. 定稿：60fps、1080p、固定码率一次出片
3. `ffmpeg -i` 核对规格；ebur128 核对响度；成片每 2.5s 抽帧复查

**阶段 6 · 交付（5%）**
1. README 写清依赖和命令；lint；commit
2. 发送成片；列出没做、没验证、存疑的地方；请人试听

`timeline.json` 示例：

```json
{
  "bpm": 120, "fps": 60, "duration": 30,
  "drop": 12.0, "gap": [11.88, 12.0],
  "scenes": { "s1": [0, 3.45], "s2": [2.8, 6.7], "s3": [5.95, 9.05], "s4": [9.0, 11.88],
              "s5": [12.0, 16.1], "s6": [15.85, 20.0], "s7": [20.0, 24.0], "s8": [24.0, 26.0], "s9": [26.0, 30.1] },
  "bigHits": [12.0, 16.0, 20.0, 24.0, 26.0],
  "whoosh": [8.6, 11.4, 15.72, 19.72],
  "risers": [[9.5, 2.4], [24.5, 1.4]]
}
```

`render.mjs` 分段并行的思路：

```bash
# 4 个进程各渲染 450 帧，输出无音频片段，最后拼接并混入音频
for k in 0 1 2 3; do node render.mjs --range $((k*450)),$(((k+1)*450)) --out out/part$k.mp4 & done; wait
printf "file 'part%d.mp4'\n" 0 1 2 3 > out/parts.txt
ffmpeg -f concat -safe 0 -i out/parts.txt -i out/music.wav -map 0:v -map 1:a -c:v copy \
  -af volume=-3dB -c:a aac -b:a 192k -t 30 -movflags +faststart out/final.mp4
```

### 2. 给 AI 的开工提示词模板

```text
你要用代码制作一支 {时长} 秒的 {主题} 视频，交付 MP4。

【素材】
- 仓库 / 素材路径：{路径}。先用脚本列出所有条目的元数据（标题、日期、分组、是否草稿），排除草稿和测试内容。
- 会上屏的数字（篇数、份数、月数等）必须用精确脚本统计，并对照条目列表复核。
- 参考链接：{链接}。先测能不能访问；访问不了就告诉我，并说明你改用了什么素材。
- 文案尽量直接引用原文，不要编造人设。

【规格】
- 1920×1080，{30/60} fps，时长精确到 {D}.00s；H.264 High + yuv420p + AAC 48kHz，+faststart。
- 单文件体积 ≤ {L} MB：按 L×8/D 反推码率，第一次全片渲染就用固定码率（例如 -b:v 6M -maxrate 8M -bufsize 16M），不要先 crf 再二次压缩。
- 响度约 -14 LUFS，峰值 ≤ -1 dBFS；用 ebur128 实测，用静态增益修正。

【叙事与节奏】
- 先给出情绪曲线和分幕，再按小节切镜头；每个镜头写清意图、画面、剪辑手法、音效。
- BPM 选能让一拍等于整数帧的值（例如 120 BPM 配 60fps = 30 帧/拍）。
- 前段 {温情 / 叙事}，{第 N 秒} drop 前静默半拍；卡点段每拍必须有可见动作。
- 各段风格：{列出}；统一元素：{遮幅 / 颗粒 / 角标 / 冲切手感}。

【技术约束】
- 画面：单文件 HTML，window.__render(t, frame) 必须是 t 的纯函数；随机数带种子；不引入会让帧依赖上一帧的动画库。
- 缓动用项目的 token：{cubic-bezier 值}。配色用项目主题 token：{路径}。
- 字体：npm @fontsource 本地加载；截图前把所有场景设为可见，document.fonts.load(字体, 全部文字)，再 await document.fonts.ready。
- 依赖布局的测量（文字宽度、屏幕位置）在字体加载后、元素可见时做，不要估算。
- 音频：numpy/scipy 程序合成，所有时间点和画面共用 timeline.json。
- 渲染：playwright-core + 预装 Chromium（executablePath），JPEG q94 通过 image2pipe 管道给 ffmpeg；支持 --stills 和 --range 分段并行。
- 视频工具链不写进项目 package.json；遵守项目 AGENTS.md（临时文件目录、commit 格式、推送前是否要问）。
- 用脚本批量改源码时，先断言锚点字符串只出现一次。
- 长任务放后台跑，用 until 循环同时匹配成功和失败两种输出。

【检查】
- 每轮抽静帧：每个场景的入场 / 中段 / 出场 + 每个转场的起点 / 中点 / 终点，用 ffmpeg tile 拼联系表后看图。
- 检查点：遮幅安全区、文字重叠、动画是否在镜头结束前完成、滚动或计数的终值、数字和原文逐字一致。
- 成片再每 2.5s 抽一帧复查。
- 交付时说明：规格实测值（时长 / 码率 / 体积 / LUFS / 峰值）、没做或没验证的事（例如音频没人工试听）、需要我确认的地方。
```
