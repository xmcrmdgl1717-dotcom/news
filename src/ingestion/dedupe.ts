import { Payload } from 'payload'
import { hammingDistance } from './simhash'
import { NormalizedArticle } from './types'

export async function isDuplicate(
  payload: Payload,
  article: NormalizedArticle,
): Promise<boolean> {
  // 1. URL 精确去重
  const byUrl = await payload.find({
    collection: 'articles',
    where: { source_url: { equals: article.source_url } },
    limit: 1,
  })
  if (byUrl.docs.length > 0) return true

  // 2. SimHash 近重复
  const recent = await payload.find({
    collection: 'articles',
    where: {
      published_at: {
        greater_than: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
    },
    limit: 500,
    depth: 0,
  })
  for (const doc of recent.docs as any[]) {
    if (doc.simhash && hammingDistance(doc.simhash, article.simhash) <= 3) {
      return true
    }
  }
  return false
}
