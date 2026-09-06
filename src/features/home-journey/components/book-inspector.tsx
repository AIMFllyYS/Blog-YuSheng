export type BookDetail = 'binding' | 'seal' | 'pages'

const DETAILS = {
  seal: { title: '封面题签', text: '羽升集。最初的两个字，在一册玄青线装书上重新落定。' },
  binding: { title: '四眼线装', text: '丝线沿着书脊逐针绕合。四个针眼，把散开的纸页连成一卷。' },
  pages: { title: '纸页留痕', text: '纤维、墨痕与页边的层叠随光显现。也可以直接点击书上的题签、针脚和翻动的纸页。' },
} as const

export function BookInspector({ detail, onInspect }: { detail: BookDetail | null; onInspect: (detail: BookDetail | null) => void }) {
  return (
    <aside className="journey-book-inspector" aria-label="探索这册书">
      <div className="journey-book-inspector-controls">
        <span>近看 · 一册书</span>
        {(Object.keys(DETAILS) as BookDetail[]).map((key) => (
          <button key={key} data-inspect-book={key} type="button" aria-pressed={detail === key} onClick={() => onInspect(key)}>{DETAILS[key].title}</button>
        ))}
      </div>
      {detail ? (
        <div data-book-insight className="journey-book-detail" role="status">
          <div><strong>{DETAILS[detail].title}</strong><button type="button" aria-label="关闭书中细节" onClick={() => onInspect(null)}>×</button></div>
          <p>{DETAILS[detail].text}</p>
        </div>
      ) : null}
    </aside>
  )
}
