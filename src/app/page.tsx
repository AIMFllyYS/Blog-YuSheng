import Link from 'next/link'

const pillars = [
  {
    id: '01',
    title: '记录 · AI 成长轨迹',
    desc: '记录我在 AI 领域的成长经历：从基础架构的分析与摸索开始，逐步汇总过去写过的内容，让每一步都有迹可循。',
    tags: ['#成长日志', '#AI', '#内容汇总'],
  },
  {
    id: '02',
    title: '私密 · 权限与边界',
    desc: '这个博客首先是写给我自己的，所以它必须有价值。未来会有权限系统 —— 有的文章只有我自己能看。',
    tags: ['#对内价值', '#权限控制'],
  },
  {
    id: '03',
    title: '沉淀 · 方法论输出',
    desc: '当理解足够深，个人经历会被梳理成一套方法论，甚至一套课程 —— 从记录自己，到帮助大家。',
    tags: ['#知识沉淀', '#课程化'],
  },
  {
    id: '04',
    title: '生活 · 思考与日常',
    desc: '想法、思考的成长、每日日报与打卡统计……这些内容我随时可以回看，甚至交给智能体去看 —— 它就是我的另一个电子分身。',
    tags: ['#日报', '#打卡', '#电子分身'],
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fc] text-[#111827]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-6 inline-block rounded-full border border-[#b45309]/30 bg-[#b45309]/5 px-4 py-1 text-sm font-medium text-[#b45309]">
          🌱 v0.0.1 · 占位启航
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
          羽升 <span className="text-[#b45309]">YuSheng</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[#4b5563]">
          我的电子分身 · 从一颗种子开始生长。
          <br />
          记录 AI 成长、沉淀方法论、构建带有权限系统的个人内容空间。
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-[#4b5563]">
          <span className="rounded-md bg-black/5 px-3 py-1">部署于 腾讯云 EdgeOne Pages</span>
          <span className="rounded-md bg-black/5 px-3 py-1">Next.js · App Router · SSG</span>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#111827]">
          它为什么存在
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {pillars.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-sm text-[#b45309]">{p.id}</span>
                <h3 className="text-lg font-semibold">{p.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#4b5563]">{p.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#52796f]">
                {p.tags.map((t) => (
                  <span key={t} className="rounded bg-[#52796f]/10 px-2 py-0.5">
                    {t}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 text-center text-sm text-[#4b5563]">
        <p>© 2026 羽升 YuSheng · 一颗会长大的种子</p>
        <p className="mt-2">
          <Link href="/" className="text-[#b45309] hover:underline">
            blog.yusheng.email
          </Link>{' '}
          · contact@yusheng.email
        </p>
      </footer>
    </main>
  )
}
