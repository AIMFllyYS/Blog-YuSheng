const CHAPTERS = [
  { title: '散', label: '文字入星', progress: 0.25 },
  { title: '聚', label: '万字归书', progress: 0.47 },
  { title: '启', label: '开卷有光', progress: 0.68 },
  { title: '门', label: '众妙之门', progress: 0.875 },
] as const

export function JourneyChapters({ active, onSelect }: { active: number; onSelect: (progress: number) => void }) {
  return (
    <nav className="journey-chapters" aria-label="首页叙事章节">
      <span className="journey-chapter-eyebrow">一卷星河</span>
      {CHAPTERS.map((chapter, index) => (
        <button key={chapter.title} type="button" aria-current={active === index ? 'step' : undefined} aria-label={`第${index + 1}章：${chapter.label}`} onClick={() => onSelect(chapter.progress)}>
          <span className="journey-chapter-number">0{index + 1}</span>
          <span>{chapter.title}</span>
          <span className="journey-chapter-label">{chapter.label}</span>
        </button>
      ))}
    </nav>
  )
}
