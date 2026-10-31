import { getPayload } from 'payload'
import config from '../payload.config'
import { fetchGdelt, gdeltDelay } from './gdelt'
import { fetchRss, FeedSource } from './rss'
import { normalize } from './normalizer'
import { isDuplicate } from './dedupe'

// 先手写一批种子源，后续可迁移到 source registry 集合
const SEED_FEEDS: FeedSource[] = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', language: 'en' },
  { url: 'https://www.theguardian.com/world/rss', name: 'Guardian World', language: 'en' },
  { url: 'https://feeds.reuters.com/reuters/worldNews', name: 'Reuters World', language: 'en' },
  { url: 'https://rss.dw.com/rdf/rss-en-world', name: 'DW World', language: 'en' },
]

const GDELT_QUERIES = [
  { query: 'world news', lang: 'english' },
  { query: 'technology', lang: 'english' },
  { query: 'business', lang: 'english' },
]

export async function runIngestion(): Promise<void> {
  const payload = await getPayload({ config })
  let inserted = 0
  let skipped = 0

  const candidates = []

  for (const q of GDELT_QUERIES) {
    try {
      const items = await fetchGdelt({ query: q.query, lang: q.lang, maxRecords: 50 })
      candidates.push(...items)
    } catch (e) {
      console.error('[gdelt] failed', q, e)
    }
    await gdeltDelay()
  }

  for (const feed of SEED_FEEDS) {
    try {
      const items = await fetchRss(feed)
      candidates.push(...items)
    } catch (e) {
      console.error('[rss] failed', feed.url, e)
    }
  }

  for (const raw of candidates) {
    try {
      const norm = normalize(raw)
      if (await isDuplicate(payload, norm)) {
        skipped++
        continue
      }
      await payload.create({ collection: 'articles', data: norm as any })
      inserted++
    } catch (e) {
      console.error('[insert] failed', raw.url, e)
    }
  }

  console.log(`[ingestion] inserted=${inserted} skipped=${skipped}`)
  process.exit(0)
}

if (require.main === module) runIngestion()
