import Link from 'next/link'
import { ArticleView } from '@/lib/article-view'

export function ArticleCard({ article }: { article: ArticleView }) {
  return (
    <article className="border-t border-hairline pt-3">
      <div className="label-caps mb-1" style={{ color: article.section_color }}>
        {article.source_name}
      </div>
      <Link href={`/articles/${article.slug}`}>
        <h3 className="font-serif text-lg font-semibold leading-snug hover:underline">
          {article.title}
        </h3>
      </Link>
      <div className="mt-2 text-xs text-ink-muted">
        {new Date(article.published_at).toLocaleString('en-GB', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </div>
    </article>
  )
}
