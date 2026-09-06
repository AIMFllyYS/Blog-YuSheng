/** Tiny CSS objects echo the film without pulling a second 3D runtime into
 * ordinary navigation. The card remains one link, never nested hit targets. */
export function DestinationObject({ kind }: { kind: 'blog' | 'notes' | 'works' | 'about' }) {
  return (
    <span className={`journey-entry-object journey-entry-object-${kind}`} aria-hidden="true">
      <span className="journey-entry-pages" />
      <span className="journey-entry-cover">
        {kind === 'blog' ? <span className="journey-entry-vertical">羽升集</span> : null}
        {kind === 'notes' ? <span className="journey-entry-lines"><i /><i /><i /></span> : null}
        {kind === 'works' ? <svg viewBox="0 0 40 44"><path d="M20 3 36 12v20L20 41 4 32V12L20 3Zm0 0v19m16-10L20 22 4 12m16 10v19M4 32l16-10 16 10" fill="none" stroke="currentColor" strokeWidth=".8" /></svg> : null}
        {kind === 'about' ? <span className="journey-entry-seal">羽</span> : null}
      </span>
    </span>
  )
}
