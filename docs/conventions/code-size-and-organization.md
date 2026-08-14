# 代码长度与文件组织规范

> 本文档是 `AGENTS.md` 中"代码长度"与"文件放置"条款的完整背景说明。
> AGENTS.md 是面向 AI 编码代理的精简操作策略，本文档面向人类开发者，提供理由、阈值参考与判断方法。

## 一、核心原则

### 1. 长度是触发器，不是规则

> **Length is a trigger to look, never a rule to obey.**
> —— [human-readable-code](https://github.com/jwmurray/human-readable-code)

长文件/长函数是**代码异味（code smell）**，不是**违规**。它的本质问题是认知复杂度（cognitive complexity），而不是行数本身。

- 超过阈值 → 停下来审视，找**自然接缝（natural seam）**
- 自然接缝 = 一个可独立命名的职责能干净分离的点
- 有真实接缝 → 拆分
- 没有真实接缝 → 保持完整，留一行注释说明原因
- **永远不要为了凑数字而拆** —— 人为拆分比一个诚实的大文件更糟

### 2. 函数长度与复杂度成反比

> The maximum length of a function is inversely proportional to the complexity and indentation level of that function.
> —— [Linux Kernel Coding Style](https://kernel.org/doc/html/latest/process/coding-style.html)

- 概念简单的线性流程（如长 case-statement）可以稍长
- 复杂、高嵌套的函数必须更短
- 人脑同时能跟踪约 7 件事，超过就容易混乱

### 3. 文件放置由使用范围决定，不由行数决定

> A file should live as close as possible to where it's used.
> —— [Next.js colocation 实践](https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/)

Next.js App Router 支持 safe colocation by default，文件放在路由文件夹内不会变成路由。应优先就近放置。

## 二、阈值参考

以下数字来自业界经验（ESLint `max-lines`、human-readable-code、clean-code 文献），**每个数字都读作"在这里看一眼"，不是"在这里服从"**：

| 维度 | 软目标 | 停下来审视 | 拆分或说明原因 |
|---|:---:|:---:|:---:|
| 函数长度 (LOC) | ~50 | ~60 | 80+ |
| 文件长度 (LOC) | ~400 | ~600 | 800+ |
| 圈复杂度 | ≤5 | >10 | >15 |
| 嵌套深度 | ≤3 | 4 | 5+ |
| 函数参数 | ≤4 | 5 | 6+ |

- ESLint `max-lines` 官方说明：不存在客观的最大行数，推荐区间 100–500 行，目的是"aid maintainability and reduce complexity"
- 本项目**不启用** `max-lines` / `max-lines-per-function` 等硬性 lint 规则，避免诱导机械式拆分
- 这些阈值仅作为 code review 时的审视提示

## 三、文件放置决策树

```
这段代码被谁使用？
│
├─ 只在一个路由内使用
│   └─ 放在该路由文件夹内（如 app/blog/_components/）
│      ※ 无论文件多长都留在路由内，不要因为"太长"就提升
│
├─ 同父路由下多个路由共用
│   └─ 上移到共同父级路由文件夹
│
├─ 跨多个不相关路由的领域模块（可独立删除/迁移）
│   └─ 提升到 src/features/<domain>/
│      ※ 判断依据是"领域边界"，不是"文件长度"
│      ※ src/features/ 是领域聚合层，不是长文件回收站
│
├─ 无业务逻辑的纯展示组件（Button, Card, Input）
│   └─ src/components/ui/
│
└─ 通用工具函数 / hooks
    └─ src/lib/
```

### `src/features/` 的正确用法

`src/features/<domain>/` 拥有该领域的全部代码：schema、server actions、queries、client components、types、tests。路由 `app/(app)/<domain>/page.tsx` 只做组合（通常 <30 行）。

**提升到 features 的条件（全部满足）**：
1. 该领域是一个可独立命名的业务概念
2. 跨多个不相关路由复用
3. 可作为整体删除或迁移而不影响其他领域

**不应提升的情况**：
- 单路由专用组件变长了 → 留在路由内
- 两个路由共用一个工具函数 → 上移到共同父级或 `src/lib/`
- 只是"page.tsx 超过 200 行了" → 这不是提升理由，先找自然接缝在路由内拆分

## 四、拆分判断方法

当文件/函数触发审视阈值时，按以下顺序判断：

1. **找自然接缝**：是否存在一个可独立命名的职责，能干净分离且不产生循环依赖？
   - 是 → 按职责拆分，每个拆分单元有单一职责
   - 否 → 进入第 2 步

2. **判断是否职责混杂**：文件/函数是否同时承担了多个不同关注点？
   - 是 → 按关注点拆分（如数据获取 / 渲染 / 业务规则分离）
   - 否 → 进入第 3 步

3. **保留完整并注释**：代码内聚良好、无自然接缝，保持完整，在文件/函数顶部留一行注释说明为何不拆分

**禁止的拆分模式**：
- 为凑行数把一个内聚函数切成三段
- 把单路由用的代码提升到 `src/features/` 只因为"太长"
- 按文件类型机械拆分（把一个组件的渲染、样式、逻辑分到三个文件）

## 五、参考来源

- [ESLint max-lines 规则文档](https://eslint.org/docs/latest/rules/max-lines)
- [Linux Kernel Coding Style](https://kernel.org/doc/html/latest/process/coding-style.html)
- [human-readable-code](https://github.com/jwmurray/human-readable-code)
- [Small Files Are Your Friends — Codecraft](https://codecraft.co/small-files-are-your-friends.html)
- [Next.js colocation 官方文档](https://nextjs.org/docs/14/app/building-your-application/routing/colocation)
- [How to Build Reusable Architecture for Large Next.js Applications — freecodecamp](https://www.freecodecamp.org/news/reusable-architecture-for-large-nextjs-applications/)
- [How to structure a Next.js project for scale — Cadence](https://cadence.withremote.ai/blog/structure-nextjs-project-scale)
- [Scalable Next.js Project Structure — Matthew Wong](https://www.matthewswong.com/en/blog/nextjs-project-structure-scalable/)
