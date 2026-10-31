import Link from 'next/link'

export function Masthead() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto max-w-editorial px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="font-serif text-2xl font-bold tracking-tight">
            Global News
          </Link>
          <nav className="hidden gap-6 text-sm font-semibold md:flex">
            <Link href="/section/world">World</Link>
            <Link href="/section/business">Business</Link>
            <Link href="/section/tech">Tech</Link>
            <Link href="/section/culture">Culture</Link>
          </nav>
          <div className="flex gap-3 text-sm text-ink-muted">
            <button>EN</button>
            <button>中文</button>
          </div>
        </div>
      </div>
    </header>
  )
}
