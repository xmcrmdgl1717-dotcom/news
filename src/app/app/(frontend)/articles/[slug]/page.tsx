import { notFound } from 'next/navigation'
import { payloadClient } from '@/lib/payload'
import { toView } from '@/lib/article-view'
import { Masthead } from '@/components/Masthead'

export const revalidate = 60

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await payloadClient()

  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    limit: 1,
    depth: 2,
  })

  const doc = docs[0]
  if (!doc) notFound()
  const view = toView(doc)

  return (
    <>
      <Masthead />
      <main className="mx-auto max-w-[720px] px-4 py-8">
        <div className="label-caps mb-2" style={{ color: view.section_color }}>
          {view.source_name}
        </div>
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          {view.title}
        </h1>
        {view.summary && (
          <p className="mt-4 text-lg text-ink-secondary">{view.summary}</p>
        )}
        <div className="mt-4 text-xs text-ink-muted">
          {new Date(view.published_at).toLocaleString('en-GB', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </div>

        <hr className="my-6 border-hairline" />

        {view.content_available === 'summary_only' ? (
          <div>
            <p className="text-ink-secondary">
              本站为聚合摘要视图，完整报道请前往原站阅读。
            </p>
            {doc.source_url && (
              <a
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-4 inline-block bg-ink px-4 py-2 text-sm font-semibold text-white"
              >
                阅读原文 →
              </a>
            )}
          </div>
        ) : (
          <div className="prose prose-lg max-w-none">
            {/* 手动文章使用 Lexical 渲染器，下一阶段接入 */}
            <p>（手动文章正文渲染器将在第 2 阶段接入 Lexical Renderer）</p>
          </div>
        )}
      </main>
    </>
  )
}
