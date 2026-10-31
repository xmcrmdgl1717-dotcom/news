import Link from 'next/link'
import { ArticleView } from '@/lib/article-view'

export function LeadStory({ article }: { article: ArticleView }) {
  return (
    <article className="border-b border-hairline py-6">
      <div className="label-caps mb-2" style={{ color: article.section_color }}>
        {article.source_name}
      </div>
      <Link href={`/articles/${article.slug}`}>
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          {article.title}
        </h1>
      </Link>
      {article.summary && (
        <p className="mt-3 max-w-2xl text-ink-secondary">{article.summary}</p>
      )}
      <div className="mt-3 text-xs text-ink-muted">
        {new Date(article.published_at).toLocaleString('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </div>
    </article>
  )
}
