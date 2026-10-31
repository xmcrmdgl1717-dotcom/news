export interface ArticleView {
  id: string
  title: string
  slug: string
  summary: string
  source_type: 'auto' | 'manual'
  source_name: string
  published_at: string
  language: string
  section_color: string
  content_available: 'full' | 'summary_only'
  image_url: string | null
  display_score: number
}

export function toView(doc: any): ArticleView {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary_zh || doc.summary_en || '',
    source_type: doc.source_type,
    source_name: doc.source_name || '',
    published_at: doc.published_at,
    language: doc.language,
    section_color: doc.section?.color || '#121212',
    content_available: doc.source_type === 'manual' ? 'full' : 'summary_only',
    image_url: doc.featured_image?.url ?? null,
    display_score: doc.display_score ?? 0,
  }
}
