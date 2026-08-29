export function EmbedOpenLink({ href }: { readonly href: string }) {
  return (
    <a
      className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs tracking-[0.08em] text-[var(--ink-muted)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      data-embed-open=""
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      打开
    </a>
  )
}
