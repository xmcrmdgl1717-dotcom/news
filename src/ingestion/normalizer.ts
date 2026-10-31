import { RawArticle, NormalizedArticle } from './types'
import { simhash64 } from './simhash'
import { createHash } from 'crypto'

export function slugify(title: string, url: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
  const suffix = createHash('md5').update(url).digest('hex').slice(0, 6)
  return `${base}-${suffix}`
}

export function normalize(raw: RawArticle): NormalizedArticle {
  const text = `${raw.title} ${stripHtml(raw.raw_html_or_snippet)}`
  return {
    title: raw.title || '(无标题)',
    slug: slugify(raw.title || 'untitled', raw.url),
    language: raw.language || 'en',
    summary_en: stripHtml(raw.raw_html_or_snippet).slice(0, 300),
    source_url: raw.url,
    source_name: raw.source_name,
    published_at: raw.published_at,
    simhash: simhash64(text),
    source_type: 'auto',
    status: 'published',
    importance: 0.5,
    display_score: 0.5,
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
