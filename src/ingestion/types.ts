export interface RawArticle {
  url: string
  title: string
  raw_html_or_snippet: string
  source_name: string
  language: string
  published_at: string // ISO8601
  source_type: 'gdelt' | 'rss' | 'rsshub' | 'manual'
}

export interface NormalizedArticle {
  title: string
  slug: string
  language: string
  summary_en: string
  summary_zh?: string
  source_url: string
  source_name: string
  published_at: string
  simhash: string
  source_type: 'auto'
  status: 'published'
  importance: number
  display_score: number
}
