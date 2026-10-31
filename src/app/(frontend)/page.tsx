import { payloadClient } from '@/lib/payload'
import { toView } from '@/lib/article-view'
import { Masthead } from '@/components/Masthead'
import { LeadStory } from '@/components/LeadStory'
import { ArticleCard } from '@/components/ArticleCard'

export const revalidate = 60

export default async function HomePage() {
  const payload = await payloadClient()

  const { docs } = await payload.find({
    collection: 'articles',
    where: { status: { equals: 'published' } },
    sort: '-display_score',
    limit: 13,
    depth: 1,
  })

  const items = docs.map(toView)
  const [lead, ...rest] = items

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-editorial px-4">
        {lead && <LeadStory article={lead} />}
        <section className="grid gap-x-6 gap-y-6 py-6 md:grid-cols-2 lg:grid-cols-4">
          {rest.slice(0, 8).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </section>
        <section className="border-t border-hairline py-6">
          <h2 className="label-caps mb-4">Latest</h2>
          <ul className="divide-y divide-hairline">
            {rest.slice(8).map((a) => (
              <li key={a.id} className="flex items-baseline gap-4 py-2">
                <time className="w-28 shrink-0 text-xs text-ink-muted">
                  {new Date(a.published_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
                <span className="text-xs uppercase tracking-wide text-ink-muted">
                  {a.source_name}
                </span>
                <a href={`/articles/${a.slug}`} className="font-serif text-sm hover:underline">
                  {a.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
