import Parser from 'rss-parser'
import { RawArticle } from './types'

const parser = new Parser({ timeout: 15000 })

export interface FeedSource {
  url: string
  name: string
  language: string
}

export async function fetchRss(source: FeedSource): Promise<RawArticle[]> {
  const feed = await parser.parseURL(source.url)
  return (feed.items ?? []).map((item) => ({
    url: item.link!,
    title: (item.title ?? '').trim(),
    raw_html_or_snippet: item.contentSnippet ?? item.content ?? '',
    source_name: source.name,
    language: source.language,
    published_at: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    source_type: 'rss',
  }))
}
