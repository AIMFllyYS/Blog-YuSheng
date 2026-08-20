# 认证、作者白名单与公开讨论持久化

> Created: 2026-08-21
> Updated: 2026-08-21
> Status: draft（P1 进入门。夜跑已建 #80 树并落地 #82 注入缝；本文未 accepted 前不得宣称公开写入可上线）
>
> 本规格是 P1「公开互动」的唯一进入门。它补齐 [架构 D1 / D6 / D15](../designs/architecture-overview.md) 与 [内容引擎第九、十节](./blog-content-engine.md) 留下的认证、邮件、白名单、表/RLS/RPC、anchor manifest 与限流契约。总体范围见 [计划第五节](../plans/plan-blog-foundation.md)。DOCX/PDF 导出不在本文，见独立技术验证。

## 一、背景

P0 已经把讨论的产品形态、权限函数、内存/本地仓储和 `discussion` profile 安全渲染做完，但**没有真实身份、没有服务端权限、没有云端写入**。现状代码按「客户端传入的 `DiscussionUser`」做授权，作者徽标按写死的开发 ID 判断。这在开发仓储里可接受，一旦浏览器直连数据库就会变成可伪造的权限。

站点是 Next.js `output: 'export'` 静态站，部署到 EdgeOne Pages。已核实：

- 无 App Router route handler、无 `proxy.ts`、无 Server Action。
- `edgeone.json` 的 `cloudFunctions` 只是字段占位（`maxDuration` + `regions.mainland`），**没有绑定函数**。今晚与后续 P1 都不得把公开写入设计成「加一个 API 路由校验一下」。

因此公开写入只能是：**浏览器直连与 Supabase 兼容的 Postgres（本地 Docker 先行）+ RLS / RPC 兜底**。

## 二、目标与非目标

### 2.1 目标

- 弹窗式邮箱登录；不设 `/login/`（D15）。
- 作者身份只从「已验证邮箱 + 服务端白名单」派生；不接受客户端传入的 `isAuthor`（D1）。
- 匿名只读；成员可写且只能改自己的；作者可删任意讨论但不能改他人文字。
- 讨论源码写入前与每次读取渲染都走 `discussion` profile 复验；库里存着的不是可信 HTML（D6 / 规格 7.2）。
- 注释锚点相对构建产物 `out/blog/<slug>/anchor-manifest.json` 做受信校验，不信客户端自证。
- 开发与验证期使用本地 Docker 数据库，schema / RLS / RPC 与 Supabase 兼容；云端项目迁移后置。
- 阿里云邮件推送只做基础配置：`.env.example`（标明属于 Auth 容器环境）、配置接口、可注入的测试/开发 `MailPort`；本阶段不做真实发送测试。生产魔法链接只由 Auth 容器发信，不由 Next 进程发信。

### 2.2 非目标

- Next.js 服务端运行时、EdgeOne 云函数、自建 BFF。
- 私密文章、私人注释、分级可见、审核流、软删除、举报后台。
- 社交登录、手机号、密码账密（v1 只做邮箱魔法链接 / OTP）。
- 在本规格周期内对阿里云控制台做真实发信联调。
- 把 `DiscussionRepository.replaceThread` 顺手改成远程写回（见第十四节，单独立项）。
- 把 P0 本机 `localStorage` 草稿同步到公开库（架构 D22）。
- DOCX/PDF、在线编辑、AI 分身。

## 三、硬约束

1. **没有服务端运行时。** 浏览器持有用户会话，经 PostgREST / Supabase JS 调表或 RPC。授权发生在数据库里，不发生在 Next 里。
2. **客户端 `isAuthor` 不是权限输入。** `AuthPort` 对 UI 暴露的 `isAuthor`（若保留）必须是会话建立后从受信来源派生的只读视图；仓储、RLS、RPC 禁止读取客户端传来的该字段。
3. **讨论内容永久不可信。** 写与读都要复验，没有「只在读路径做完整校验」的退路。
   - 浏览器在调用写 RPC **之前**必须走现有 `validateDiscussionWrite`（仓库里唯一实现；讨论面板打开后动态 `import()`，不进阅读首屏）。
   - RPC 只做数据库能做的检查：长度、归属、`auth.uid()`、会话未作废、粗禁原始 HTML 标签。**禁止**在 SQL、Postgres 扩展或 Next/Edge 里复制 doc-engine。
   - 读取渲染必须走 `sanitizeDiscussionRead`。库列只存 `source` 原文，禁止把清洗 HTML 当权威。
   - 直打 RPC 绕过客户端时：粗检失败则拒绝写入；粗检通过的非法源码仍须在读路径安全降级，且该条算非法写入（测试必须覆盖）。
4. **先 Docker，后云。** 实现 issue 的默认数据库是本地容器。云端 Supabase 项目、生产密钥、国内网络不作为本规格的验收阻塞；迁移是后续运维步骤。
5. **邮件可注入、不可测发送。** 本仓库的 `MailPort` 只给测试和本机日志用。CI 不得打真实 SMTP。生产发信只发生在 Auth 容器（SMTP 或 Hook），见第七节。

本文 **取代** 下列过期的「P2 前 / Edge Function」表述（规格 accepted 时回写那些文件）：

- [内容引擎 9.2 / 10 / 十五](./blog-content-engine.md) 把公开写入、认证规格、Edge Function 校验 manifest 写在 P2。
- [architecture-overview.md](../designs/architecture-overview.md) 把登录/表结构写成「P2 前完成」。
- [project-structure.md](../conventions/project-structure.md) 把 `auth-port.ts` 写成「P1 假身份 / P2 真实身份」（现行：P0 假身份 / P1 真实身份）。

公开写入的前置是本文，阶段是 **P1**。校验方是 **Postgres RPC + 已导入的 manifest 表**，不是 Next/EdgeOne 函数。本文通过 ≠ 已授权 `pnpm add`；`@supabase/supabase-js`、Docker/CLI、阿里云 SDK 仍按 AGENTS.md 边界单独授权。

## 四、身份模型

沿用 D1 三档，不增加第四档：

| 身份 | 判定 | 阅读 | 创建/回复 | 编辑自己的 entry | 删除自己的 entry | 删除任意讨论 | 编辑他人文字 | 编辑文章 |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 匿名 | 无会话或邮箱未验证 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 普通成员 | 已验证邮箱，且不在作者白名单 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 作者 | 已验证邮箱，且规范化后命中白名单 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅（P2 编辑器，不在本文实现） |

展示徽标「作者 / 访客」不是权限档。普通成员显示「访客」。公开显示名使用 `author_display_name_snapshot`（发布时快照）。不向访客暴露登录邮箱，也不把白名单下载到浏览器。

徽标必须按**该条 entry 的 `author_id`** 在读取时派生，不能用当前会话的 `user.isAuthor` 给他人打标，也不能再比 `DEV_AUTHOR_USER_ID`。派生面：

- `SECURITY DEFINER` 函数 `is_site_author()`：当前 `auth.uid()` 是否作者。
- `SECURITY DEFINER` 函数 `is_site_author_id(uuid)`：该用户 id 是否作者（函数内读 `author_allowlist` + 已验证邮箱；`REVOKE` 普通角色的定义权）。
- 列表必须走带 `author_is_site_author boolean` 的视图或 RPC（按 `author_id` 现算）。这不是写入时快照授权，也不写入 `discussion_entries` 行。

`DiscussionUser` 在 P1 的语义：

```ts
type DiscussionUser = {
  readonly id: string          // auth.users.id，稳定 UUID
  readonly displayName: string // 来自 profiles，可改；历史 entry 仍用快照
  readonly emailVerified: boolean
  readonly isAuthor: boolean   // 仅当前会话的只读视图；禁止作为 mutation 入参；禁止用来给他人条目打徽标
}
```

`canDeleteEntry` 等纯函数可以读**当前用户**的 `user.isAuthor` 做乐观 UI，但 `user` 必须来自 AuthPort 的受信会话。作者删除权的权威只在 RPC：`is_site_author()` + `auth.uid()`。远程仓储的 mutation 入参**删除** `user` 对象。

## 五、作者白名单：存放与注入

白名单是**服务端私有配置**，不进 git，不进 `out/`，不进客户端 bundle。

### 5.1 权威存储

表 `author_allowlist`：

| 列 | 类型 | 约束 |
|---|---|---|
| email_normalized | text PK | 见 5.3 |
| created_at | timestamptz | 默认 `now()` |
| note | text | 可选，仅 service role 可读 |

RLS：对 `anon` / `authenticated` **无 SELECT**。只有 `service_role` 与数据库 owner 可读写。客户端不得把白名单下载到浏览器再自己比。

作者判定在数据库内完成，例如：

```sql
auth.jwt() ->> 'email'  -- 且 email_confirmed_at 非空
```

经 5.3 规范化后 `IN (SELECT email_normalized FROM author_allowlist)`。写成两个 `SECURITY DEFINER` 函数供 RLS、RPC、徽标视图使用：`is_site_author()`（当前会话）与 `is_site_author_id(uuid)`（任意用户 id）。函数 `OWNER` 为特权角色，`search_path` 固定，并 `REVOKE` 普通角色的定义权。anon / authenticated 可 `EXECUTE` 这两个函数，但仍然 **SELECT 不到** `author_allowlist` 行，也拿不到他人邮箱。

### 5.2 注入路径

| 环境 | 注入方式 | 谁执行 |
|---|---|---|
| 本地 Docker | `supabase/seed.sql` 或仅本地的 `supabase/.env.local` 列表，由 seed 脚本 upsert。种子邮箱不得提交真实个人邮箱到公开仓库；用文档中的示例地址 | 开发者在本机 |
| CI | 测试专用邮箱，与生产白名单隔离 | CI 密钥 |
| 云端（后置） | Supabase Dashboard / `service_role` 一次性插入；或托管密钥注入的运营脚本。不把名单写进 EdgeOne 环境变量给前端 | 人 |

`.env.example` 只放**变量名与注释**，例如：

```
# 本地 seed 用，逗号分隔。不要填生产作者邮箱。
# AUTHOR_ALLOWLIST_EMAILS=author@example.com
```

实现期把该键写进 `.env.example` 与 [ports-and-env.md](../conventions/ports-and-env.md)。真实 `.env*` 不提交。

### 5.3 规范化

比较前必须：Unicode NFC、`trim`、邮箱 `local@domain` 的 domain 小写。不在客户端做「最终」比较。未验证邮箱一律不当作作者，也不当作可写成员。

## 六、邮箱登录流程（弹窗，无 `/login/`）

全站外壳（绳挂导航 / 设置 / 讨论 composer 的未登录态）打开**同一套登录弹窗**，对标原型弹窗 token（`--ease-pop`，只回弹一次）。不新增路由。

### 6.1 步骤

1. 未登录用户触发「需要登录才能写」或主动点「登录」。正文继续渲染，登录失败不得挡住文章（D20）。
2. 弹窗收集邮箱。客户端只调用 Auth 的 `signInWithOtp` / magic link API（实现库待实现 issue 选择，规格不锁 npm 包名）。`emailRedirectTo` 必须是**当前页的 origin + path + search**（或站点 `SITE_ORIGIN` 下的当前文章 URL），禁止跳到 `/login/`。
3. **发信不在博客静态进程里发生。** Auth 容器（本地 GoTrue / 云端 Auth）用自己的 SMTP 或 Hook 把一次性链接发给该邮箱。本仓库的 `MailPort` 不得作为生产魔法链接发送器，也不得从浏览器调用阿里云 HTTP API。见第七节。
4. 用户从邮件回到站点。静态页在 hydration 后由 AuthPort `completeLoginFromRedirect`（或等价 `recoverSession`）从 URL hash/query 解析会话，然后 **history.replaceState 去掉 token**，避免分享带凭证的 URL。
5. 会话建立后：若 `email_confirmed_at` 为空，视为匿名（只读），弹窗提示「请先完成邮箱验证」；验证完成前任何写 RPC 返回 `EMAIL_UNVERIFIED`。
6. 退出：客户端 `signOut`，并调用 Auth 的全局登出/刷新令牌作废接口（见第八节）。

### 6.2 产品文案与状态

- 未登录 composer：明确「登录后才能发布」，按钮打开弹窗，不假装已写入。
- 生产静态部署在接上远程库之前，前端 `DISCUSSION_WRITES_OPEN` 保持关闭。接上之后：**前端开关不是安全边界**。一旦暴露 anon key，权限只剩邮箱验证 + RLS/RPC。知情者仍可直打 RPC；库内必须另有写入总闸（RPC 读取的配置行或等价），不能只靠藏按钮。
- `_dev/` 假身份与 `local-author-mode` 只服务开发；正式路由不得依赖 `DEV_AUTHOR_USER_ID` 判断徽标。

### 6.3 AuthPort 必须加厚（实现缺口，见第十四节）

今天的端口（`src/features/discussions/domain/auth-port.ts`）只有 `getCurrentUser` + `subscribe`，装不下登录。P1 端口最小集：

```ts
type AuthPort = {
  readonly getCurrentUser: () => DiscussionUser | null
  readonly subscribe: (listener: () => void) => () => void
  readonly loginWithEmail: (email: string) => Promise<AuthFlowResult>
  readonly completeLoginFromRedirect: () => Promise<AuthFlowResult>
  readonly logout: () => Promise<void>
  readonly getSession: () => AuthSession | null
  readonly getVerifiedEmail: () => string | null
}
```

`completeLoginFromRedirect` 封装 hash/query 解析与清 token，禁止把回跳逻辑散落在页面组件。`AuthFlowResult` 覆盖：已发送链接、已恢复会话、邮箱格式非法、频率限制、提供方错误。不把原始提供方异常信息展示给访客。

## 七、阿里云邮件：配置与可注入端口

计划第五节原文：只做基础配置支持，不做真实发送测试。

### 7.1 唯一发信路径

浏览器 **只** 调 `signInWithOtp`。一次性 token 由 GoTrue/Auth 签发。静态站拿不到该 token，因此本仓库 TypeScript **不得**在浏览器或 Next 进程里发魔法链接。

生产发信只发生在 **本地或云端 Auth 容器** 的 SMTP 或 Hook。阿里云 DirectMail 若使用，适配器跑在该容器环境，不跑在 EdgeOne Pages，不跑在 `output: 'export'` 的 Node 构建机（构建机只生成静态文件）。

### 7.2 `MailPort`（测试/开发替身，不是生产发送器）

```ts
type MailMessage = {
  readonly to: string
  readonly subject: string
  readonly textBody: string
  readonly htmlBody?: string
}

type MailPort = {
  readonly send: (message: MailMessage) => Promise<
    { ok: true } | { ok: false; code: 'MAIL_DISABLED' | 'MAIL_CONFIG' | 'MAIL_REJECTED' }
  >
}
```

本仓库实现可注入端口，供单测与本机日志：测试注入内存记录器；开发可注入 `console` 适配器。禁止把 `MailPort.send` 接到阿里云 HTTP API 后从静态前端调用。`MAIL_DISABLED` 只出现在这条测试替身路径。

### 7.3 `.env.example` 键（实现期写入，本文先锁定名字）

公开连接（会进静态产物，必须是 anon）：

```
# 浏览器直连。匿名 key 设计为可公开；数据安全靠 RLS/RPC，不靠藏钥匙。
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Auth 容器 / Docker 环境（**禁止** `NEXT_PUBLIC_` 前缀，**禁止**打进 `out/`）：

```
# 阿里云邮件推送。写在 supabase/.env 或 Auth 容器环境，不是 Next 环境。
# P1 进入门只要求键存在于示例文件；CI 不发送。
# ALIYUN_DM_ACCESS_KEY_ID=
# ALIYUN_DM_ACCESS_KEY_SECRET=
# ALIYUN_DM_ACCOUNT_NAME=noreply@example.com
# ALIYUN_DM_REGION=cn-hangzhou
```

绝对禁止出现在 `NEXT_PUBLIC_*`、客户端 bundle、`out/`：`service_role`、数据库 owner 密码、Aliyun Access Key。不得用 BFF「藏钥匙」来回避 RLS。

不得在本文或实现 issue 里要求「给真实邮箱发一封看收件箱」。公开写入上线前再由人做真实发送测试。

## 八、会话撤销与邮箱验证

公开写入前必须同时具备，缺一不可：

1. **邮箱验证**：`email_confirmed_at IS NOT NULL`。未验证用户的 JWT 即使存在，RLS 也只给 SELECT。
2. **会话撤销**（可演示的一条，不要「立即失效」和「下次 refresh 才只读」并存）：
   - 用户退出：作废当前刷新令牌。
   - 作者紧急撤销：用 `service_role` 作废目标用户全部会话（Auth admin API 或等价 SQL），并在写 RPC 核验「该 `auth.uid()` 的会话未被作废」（查 session 表 / `session_id` 黑名单，而不是只信 JWT `exp`）。
   - **写路径**：撤销之后的下一次写 RPC 必须失败，码为 `SESSION_REVOKED`，即使页面上的 access token 尚未过期、UI 仍显示已登录。
   - **UI**：已打开的页可以等到下一次 `refresh` / `getCurrentUser` 才变成只读外观；外观滞后不是写成功。
3. 不引入审核状态机。撤销不是软删除讨论。

本地 Docker 必须能演示：验证前不能写；验证后能写；撤销后**不重新加载页面**再调写 RPC 仍失败。

## 九、表结构

讨论域保持**两张主表**，与现有 TypeScript 行状对齐：

- `src/features/discussions/domain/discussion-thread.ts`
- `src/features/discussions/domain/discussion-entry.ts`

另加白名单、manifest、资料三张辅助表。不把评论和注释拆成四张表。

### 9.1 `discussion_threads`

| 列 | 类型 | 对应 TS | 约束 |
|---|---|---|---|
| id | uuid PK | `id` | `gen_random_uuid()` |
| article_slug | text | `articleSlug` | 非空；只允许已知 slug 格式 |
| kind | text | `kind` | `'comment' \| 'annotation'` |
| anchor | jsonb | `anchor` / `null` | comment 必须 NULL；annotation 必须非空 |
| anchor_state | text | `anchorState` | 仅 annotation；见 11.4 |
| created_at | timestamptz | `createdAt` | 默认 now()，UPDATE 不可变 |
| updated_at | timestamptz | `updatedAt` | 仅由受信触发器 / RPC 更新 |

CHECK：`(kind = 'comment' AND anchor IS NULL) OR (kind = 'annotation' AND anchor IS NOT NULL)`。

### 9.2 `discussion_entries`

| 列 | 类型 | 对应 TS | 约束 |
|---|---|---|---|
| id | uuid PK | `id` | `gen_random_uuid()` |
| thread_id | uuid FK | `threadId` | ON DELETE CASCADE |
| parent_id | uuid FK nullable | `parentId` | 同表，同 thread，见 RPC |
| source | text | `source` | 长度上限 10000（规格 7.3） |
| source_format | text | `sourceFormat` | 固定 `'blog-markdown-v1'`，客户端不可改 |
| author_id | uuid | `authorId` | `auth.uid()` 写入时注入，UPDATE 不可变 |
| author_display_name_snapshot | text | `authorDisplayNameSnapshot` | 写入时从 profiles 快照，UPDATE 不可变 |
| created_at | timestamptz | `createdAt` | 默认 now()，不可变 |
| updated_at | timestamptz | `updatedAt` | 仅编辑 `source` 时更新 |

禁止列：`is_author`、`sanitized_html`、客户端提交的 `author_id`。

一个 thread 恰好一个 `parent_id IS NULL` 的根 entry。创建 thread 与根 entry 必须在同一 RPC 事务里完成。

### 9.3 `profiles`

| 列 | 类型 |
|---|---|
| user_id | uuid PK = `auth.users.id` |
| display_name | text |
| updated_at | timestamptz |

用户只能 UPDATE 自己的 `display_name`。历史讨论仍显示快照。

### 9.4 `anchor_manifests`

把构建产物变成数据库能读的受信副本。静态文件路径仍是 `out/blog/<slug>/anchor-manifest.json`（`src/server/content/create-anchor-manifest.ts`），但 **RPC 不去抓客户端传来的 JSON，也不在浏览器里「校验通过」就算数**。

| 列 | 类型 |
|---|---|
| article_slug | text |
| document_fingerprint | text |
| protocol_version | text | 当前 `'text-anchor-v1'`（这是 **manifest 文件** 的版本字符串，不是 `TextAnchor.protocolVersion`） |
| payload | jsonb | SelectionDocumentIndex |
| deployed_at | timestamptz |
| is_current | boolean | 当前部署 |
| is_previous | boolean | 紧邻上一部署 |

主键 `(article_slug, document_fingerprint)`。导入方式：SSG 之后由**构建机或人**用 `service_role` upsert（脚本可放 `scripts/`，不在 EdgeOne 运行时执行）。云端迁移后置，不阻塞本地 Docker 验收——本地用 fixture 导入 `p0-kitchen-sink` 的 manifest。

## 十、RLS 策略（逐条对应 D1）

所有策略对 `anon` 与 `authenticated` 显式写出。`service_role` 绕过 RLS，只给种子、manifest 导入、紧急撤销用。

### 10.1 `discussion_threads`

| 策略 | 角色 | 命令 | USING / WITH CHECK |
|---|---|---|---|
| `threads_select_public` | anon, authenticated | SELECT | true（讨论全部公开） |
| `threads_insert_none` | anon, authenticated | INSERT | false（只许 RPC） |
| `threads_update_none` | anon, authenticated | UPDATE | false（只许 RPC；含锚点状态） |
| `threads_delete_none` | anon, authenticated | DELETE | false（只许 RPC，保证级联） |

### 10.2 `discussion_entries`

| 策略 | 角色 | 命令 | USING / WITH CHECK |
|---|---|---|---|
| `entries_select_public` | anon, authenticated | SELECT | true |
| `entries_insert_none` | anon, authenticated | INSERT | false（只许 RPC，才能把 `author_id` 锁成 `auth.uid()`） |
| `entries_update_none` | anon, authenticated | UPDATE | false（只许 RPC：仅 owner 改 `source`） |
| `entries_delete_none` | anon, authenticated | DELETE | false（只许 RPC：owner 或 `is_site_author()`） |

单表 RLS 不足以表达「建 thread + 根 entry 原子」「跨表 kind/anchor」「级联删除他人回复」。因此 **INSERT/UPDATE/DELETE 全部走 RPC**，RLS 的写策略是关闭直写。SELECT 仍走表 RLS，匿名可读。列表若要带作者徽标，走带 `author_is_site_author` 的视图或 RPC，不要对表 `select(*)` 再在客户端伪造徽标。

D1 单元格落到何处（避免以为表策略已经表达 owner 更新）：

| D1 | 落点 |
|---|---|
| 匿名只读 | 表 RLS SELECT true；写 RPC 要求已验证邮箱 |
| 成员创建/回复 | RPC `create_*` / `reply_entry` |
| 成员只改自己的文字 | RPC `edit_entry`（owner） |
| 成员删自己的 | RPC `delete_entry`（owner） |
| 作者删任意 | RPC `delete_entry` + `is_site_author()` |
| 作者不能改他人文字 | RPC `edit_entry` 拒绝非 owner，即使 `is_site_author()` |
| 徽标 | `is_site_author_id(author_id)` 现算，不是客户端 `isAuthor` |

若实现选择对「仅编辑自己的 source」开放表 UPDATE：`USING (author_id = auth.uid())` 且 `WITH CHECK` 禁止改 `author_id` / `thread_id` / `parent_id` / `source_format` / `created_at`。**删除与建帖仍必须 RPC。** 推荐第一版全部写路径走 RPC，避免两套规则。

### 10.3 `profiles`

- SELECT：已登录可读公开 display_name（或对 anon 也开放，因讨论快照已公开）。
- INSERT：触发器在 `auth.users` 创建时写入。
- UPDATE：仅 `user_id = auth.uid()`。
- DELETE：禁止客户端。

### 10.4 `author_allowlist` / `anchor_manifests`

客户端无 SELECT/INSERT/UPDATE/DELETE。RPC 以 `SECURITY DEFINER` 读取 manifest 与白名单。

## 十一、RPC：必须走 RPC 的操作

| RPC | 为何不能单表 RLS | 行为 |
|---|---|---|
| `create_comment_thread(article_slug, source)` | 两行插入 + 锁 author + 校验源码 | 事务：thread `kind=comment, anchor=null` + 根 entry |
| `create_annotation_thread(article_slug, anchor, source)` | 同上，外加 manifest 校验 | 事务：校验锚点后插入 |
| `reply_entry(thread_id, parent_id, source)` | parent 必须同 thread、无环、深度 ≤ 5 | 插入子 entry |
| `edit_entry(entry_id, source)` | 只能改 source；作者也不能改他人 | owner 校验 + 源码复验 + `updated_at` |
| `delete_entry(entry_id)` | 根删除必须级联整个 thread；作者可删他人子树 | 见下 |
| `list_discussion_for_article(article_slug, cursor)` | 可选；给 UI 50 条游标与 `author_is_site_author`。不是安全边界 | 见 13.1 |

`delete_entry`：

- 调用者是该 entry 的 `author_id`，或 `is_site_author()`。
- 若 `parent_id IS NULL`：删除 thread（FK CASCADE 清全部 entry）。
- 否则：删除该节点及其回复子树（递归），更新 thread `updated_at`。
- 作者删除含他人回复的树是明确授权，不是漏洞。

RPC 一律：

1. `auth.uid()` 为空 → `UNAUTHENTICATED`。有会话但邮箱未验证 → `EMAIL_UNVERIFIED`。会话已作废 → `SESSION_REVOKED`。库内写入总闸关闭 → `WRITES_CLOSED`。
2. 频率与长度检查。
3. 粗检 source：长度、禁止原始 HTML 标签（字符串级，不是 AST）。失败则拒绝写入。**完整 AST / `discussion` profile 仍只在浏览器** `validateDiscussionWrite`（写前）与 `sanitizeDiscussionRead`（读时）执行。禁止在 SQL 里复制解析器。
4. 成功返回插入/更新后的行；失败返回 SQLSTATE 或 `json { ok, code, message }`，与第十三节错误码对齐。

错误码映射：直打表 API 的 Postgres `42501` → `RLS_DENIED`。RPC 内 owner / `is_site_author()` 失败 → `FORBIDDEN`。禁止把两者都映射成 `NOT_FOUND`。`SECURITY DEFINER` 写 RPC 会绕过表 RLS，因此正常写路径不应依赖 `RLS_DENIED` 当权限失败。

禁止 RPC 参数包含 `is_author`、`author_id`、`created_at`、`source_format`。评论（`kind=comment`）与注释（`kind=annotation`）共用这两张表和上列 RPC；列出评论是 #86，不是另一套表。

## 十二、anchor-manifest 受信校验

构建已写出 `out/blog/<slug>/anchor-manifest.json`。该 **文件** 的 `protocolVersion` 是字符串 `'text-anchor-v1'`（`src/server/content/create-anchor-manifest.ts`）。客户端锚点权威类型 `TextAnchor.protocolVersion` 是数字 `1`（`src/features/annotations/anchors/text-anchor.ts`，内容引擎第十节）。**禁止**用其中一个去等于另一个。

P0 注释写入尚未校验这份产物。P1 规则：

1. 客户端提交的 `TextAnchor` 只是**申请**。
2. `create_annotation_thread` 用 `article_slug` + `anchor.documentFingerprint` 读取 `anchor_manifests`。只接受 `is_current` 或 `is_previous`。更旧指纹 → `ANCHOR_REJECTED`，提示刷新页面后重划。
3. 分别校验：
   - 表列 `anchor_manifests.protocol_version === 'text-anchor-v1'`
   - 申请里的 `anchor.protocolVersion === 1`（数字）
   - `articleSlug`、`startBlockId === endBlockId`（v1）、block 存在、`0 <= startOffset < endOffset <= canonicalText.length`、`exact` 等于该区间文本、UTF-16 offset
4. `prefix` / `suffix` 各 ≤ 32 个 UTF-16 code unit。
5. 失败不写库。跨文章 slug 直接拒绝。

### 12.1 `anchor_state` 与 `replaceThread`

P0 `DiscussionRuntimeProvider` 在客户端 `reconnectTextAnchor` 后调用同步 `repo.replaceThread` 改 `anchorState`。远程库**不要**在第一个实现 issue 里把该方法改成 async 写回。

规格选定的默认语义（实现 issue 可在 overlay vs 写回之间再拆，但不得悄悄改 P0 同步签名混进别的 PR）：

- 库里长期保存**写入时通过校验的原始 anchor**。
- `attached` / `reattached` / `orphaned` 是相对**当前** manifest 的读时派生。客户端可以做 overlay；派生结果不是权限，访客看到孤儿注释仍然只读公开。
- 若未来要把派生状态写回，单独立项，且只能由 RPC 根据服务端 manifest 计算，不能信客户端的 `anchorState`。

## 十三、速率限制、长度与错误码

### 13.1 长度（与规格 7.3 对齐）

集中配置，RPC CHECK 与客户端 `DISCUSSION_LIMITS` 同一数字：单条 source 10,000；回复深度 5；导出讨论 500 条或 5 MB 先到者。超限拒绝当前操作，不卡死整页。

「单次列表 50 条游标」是 **UI / 仓储约定**，不是表 SELECT 的数据库硬顶（anon 的表 SELECT 仍为 true）。实现可用 `list_discussion_for_article` 或视图加 `LIMIT`；不得声称「数据库禁止一次拉全表」除非另加读 RPC 并收回表 SELECT。

### 13.2 速率

- Auth OTP / 魔法链接：按邮箱与 IP 限流（Auth 服务配置）。超限 → `RATE_LIMITED`。
- 讨论写：同一 `auth.uid()` 在同一 `article_slug` 上滑动窗口（建议初值：1 分钟 8 次写、1 小时 60 次）。超限 RPC 返回 `RATE_LIMITED`，中文提示稍后重试。
- 计数放在数据库（例如 `discussion_write_hits`）或等价的 Postgres 函数，不放在浏览器内存。

### 13.3 错误码扩展

现有 `DiscussionErrorCode`（`src/features/discussions/repository/discussion-repository.ts`）：

`UNAUTHENTICATED` | `FORBIDDEN` | `WRITES_CLOSED` | `INVALID_THREAD` | `INVALID_PARENT` | `MAX_DEPTH` | `INVALID_SOURCE` | `NOT_FOUND` | `STORAGE_QUOTA`

P1 必须增加：

| code | 何时 |
|---|---|
| `RATE_LIMITED` | OTP 或讨论写超过窗口 |
| `RLS_DENIED` | 直打表 API 收到 Postgres `42501`。不得当成 `NOT_FOUND` 静默吞掉 |
| `EMAIL_UNVERIFIED` | 有会话但邮箱未验证 |
| `SESSION_REVOKED` | 写 RPC 核验到会话已作废 |
| `ANCHOR_REJECTED` | manifest 校验失败 |
| `MAIL_DISABLED` | 仅开发：测试用 `MailPort` 未配置 |

`INVALID_SOURCE` 继续表示讨论源码未过 `discussion` profile。客户端把 `DOC-SECURITY-001`…`004` 映射为该码 + 中文 `message`，禁止把诊断码原文展示给访客。

中文 `message` 给用户；`code` 给 UI 分支与测试。PostgREST 原始错误必须映射到上表，禁止把 SQL 细节显示给访客。`FORBIDDEN` 用于 RPC 内权限失败（非 owner、作者改他人文字等），不要与 `RLS_DENIED` 混用。

## 十四、现存三个实现缺口（拆 issue 用）

以下只描述现状与验收，不在本文指定改法细节。

### 14.1 `DiscussionRuntimeProvider` 不接受注入

**状态（2026-08-21）**：注入缝已按 #82 落地。`DiscussionRuntimeProviderProps` 增加可选 `auth` / `repo`；解析在 `resolve-runtime-ports.ts`。缺省仍是 P0 假身份 + hydration 后 localStorage。注入实例在 hydration 后不得被换成默认仓储。`replaceThread` 仍是同步 `void`。

剩余：Context 仍只 `listAnnotationThreads`，文章级评论列出留给 #86。阅读页 `reader-layout.tsx` 暂不传入适配器。

### 14.2 `AuthPort` 过薄

文件：`src/features/discussions/domain/auth-port.ts` L6–10。

只有 `getCurrentUser` + `subscribe`。没有 `loginWithEmail` / `completeLoginFromRedirect` / `logout` / `getSession` / `getVerifiedEmail`。`DiscussionUser.isAuthor` 目前由 `createFakeAuthPort` 直接写死（L19–22）。徽标在 `src/features/annotations/annotation-list.tsx` L157 与导出附录里用 `entry.authorId === DEV_AUTHOR_USER_ID`。

加厚端口。徽标改为读列表上的 `author_is_site_author`（`is_site_author_id` 现算）。当前会话的 `user.isAuthor` 只给自己的乐观 UI，禁止继续用开发 ID 常量，禁止用当前用户布尔给他人打标。

### 14.3 `replaceThread` 是同步 `void`

文件：`discussion-repository.ts` L84；`memory-discussion-repository.ts` L269–272；`local-storage-discussion-repository.ts` L139–142。

只服务于客户端重连锚点后改 `anchorState`。远程库用 overlay 或另开 async 写回 issue，**不要**顺手改签名塞进 14.1。

## 十五、本地 Docker 与云端后置

- 开发默认：Docker Compose / Supabase CLI 本地栈（Postgres + Auth + PostgREST）。CLI 默认端口段 **54321+**，与站点 998x 不冲突，见 [ports-and-env.md](../conventions/ports-and-env.md)。
- 浏览器连接本地栈使用 `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
- 迁移文件必须能在云端 Supabase 原样 apply；禁止本地用一套触发器、云端再手改。
- 云端项目创建、生产 anon key、DNS、Aliyun 生产发信：blocked-on-human，不写入本规格的「实现完成」定义。
- 本地验收用 slug `p0-kitchen-sink` 的 fixture manifest 与测试用户。

## 十六、安全渲染（写入后仍要做）

与规格 7.2 重复声明，避免实现者以为 RLS 等于 XSS 防护：

- 写：浏览器 `validateDiscussionWrite` → RPC 粗检 → 拒绝或存**原始 source**。没有「服务端再写一套解析器」。
- 读：再解析 → 再验证 → sanitize → 再渲染。`DiscussionEntryBody` 已走 `sanitizeDiscussionRead`；远程数据不得改为 `dangerouslySetInnerHTML` 直接吐库里的 HTML。
- 禁止原始 HTML、任意 JS/CSS、iframe、危险 URL、用户控制的动态 import。

## 十七、进入门验收（本文怎样算 accepted）

人确认以下全部为真后，才能把本文标为 accepted。实现 issue 树见 #80；未 accepted 前不得宣称公开写入可上线。#82 纯重构已经按夜跑落地，不回滚。

1. 同意「无 Next 运行时、浏览器直连 DB + RLS/RPC」；同意 §7.3 的公开 URL/anon key 与禁止 `service_role` 进 `out/`。
2. 同意白名单表对客户端不可读；作者权与徽标分别由 `is_site_author()` / `is_site_author_id()` 派生。
3. 同意两张主表 + RPC 列表 + 错误码扩展。
4. 同意 manifest 导入表，而不是 Edge Function 抓静态文件；同意两种 `protocolVersion` 分别校验。
5. 同意邮件只配置、不测发送；同意生产发信只在 Auth 容器。
6. 同意 14.2 / 14.3 仍各自单独立项；14.1 注入缝已由 #82 落地。

实现完成不在本文验收；本文不关闭任何 GitHub issue。
