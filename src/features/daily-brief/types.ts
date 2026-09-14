/**
 * 一份已发现的小日报。构建期由 `src/server/briefs/` 产出，
 * 目录页与详情页（含客户端组件）共用；本文件不得引入 server-only。
 */
export type BriefEntry = {
  /** `YYYY-MM-DD`，也是路由参数与文件名里的日期 */
  readonly date: string
  readonly year: number
  /** 1–12 */
  readonly month: number
  /** 1–31 */
  readonly day: number
  /** ISO 星期：1 = 周一 … 7 = 周日 */
  readonly weekday: number
  readonly isoYear: number
  readonly isoWeek: number
  /** 原件 `<title>` 全文 */
  readonly title: string
  /** 去掉品牌与日期后的短标题，用于台历卡与报头 */
  readonly headline: string
  /** 可选：DESIGN LESSON 块里的 THESIS，一句话导语 */
  readonly thesis?: string
  /** 可选：DESIGN LESSON 块里的 STYLE */
  readonly style?: string
  /** 可选：DESIGN LESSON 块里的 GENRE */
  readonly genre?: string
  /** 原件公开 URL：`/briefs/<date>.html` */
  readonly publicUrl: string
  /** 阅读页路由：`/daily/<date>/` */
  readonly href: string
  readonly bytes: number
}
