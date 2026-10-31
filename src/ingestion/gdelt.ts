import { RawArticle } from './types'

const BASE = process.env.GDELT_BASE || 'https://api.gdeltproject.org/api/v2/doc/doc'

interface GdeltOptions {
  query: string
  lang?: string
  maxRecords?: number
  mode?: 'ArtList' | 'TimelineVol'
}

export async function fetchGdelt(opts: GdeltOptions): Promise<RawArticle[]> {
  const url = new URL(BASE)
  url.searchParams.set('query', opts.query)
  url.searchParams.set('mode', opts.mode ?? 'ArtList')
  url.searchParams.set('format', 'json')
  url.searchParams.set('maxrecords', String(opts.maxRecords ?? 50))
  url.searchParams.set('sort', 'DateDesc')
  if (opts.lang) url.searchParams.set('sourcelang', opts.lang)

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'news-global/0.1' },
  })
  if (!res.ok) throw new Error(`GDELT ${res.status}`)

  const data = await res.json().catch(() => ({ articles: [] }))
  const items = (data.articles ?? []) as any[]

  return items.map((a) => ({
    url: a.url,
    title: a.title ?? '',
    raw_html_or_snippet: a.seendate ?? '',
    source_name: a.domain ?? 'GDELT',
    language: a.language ?? opts.lang ?? 'en',
    published_at: parseGdeltDate(a.seendate),
    source_type: 'gdelt',
  }))
}

function parseGdeltDate(s: string): string {
  // GDELT seendate: 20240115123000
  if (!s || s.length < 14) return new Date().toISOString()
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`
  return iso
}

// 遵守 5 秒一次限速
export function gdeltDelay(ms = 5500) {
  return new Promise((r) => setTimeout(r, ms))
}
