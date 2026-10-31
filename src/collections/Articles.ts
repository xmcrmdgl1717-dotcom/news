import { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'source_type', 'status', 'section', 'published_at'],
  },
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { status: { equals: 'published' } }
    },
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    {
      name: 'source_type',
      type: 'select',
      required: true,
      defaultValue: 'auto',
      options: [
        { label: '自动采集', value: 'auto' },
        { label: '手动发布', value: 'manual' },
      ],
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'published',
      options: [
        { label: '草稿', value: 'draft' },
        { label: '待审核', value: 'in_review' },
        { label: '已发布', value: 'published' },
        { label: '已归档', value: 'archived' },
      ],
      index: true,
    },
    { name: 'language', type: 'text', required: true, defaultValue: 'en', index: true },
    { name: 'region', type: 'text', index: true },
    { name: 'section', type: 'relationship', relationTo: 'sections', index: true },
    { name: 'summary_zh', type: 'textarea' },
    { name: 'summary_en', type: 'textarea' },
    {
      name: 'content',
      type: 'richText',
      admin: { condition: (data) => data?.source_type === 'manual' },
    },
    { name: 'source_url', type: 'text' },
    { name: 'source_name', type: 'text' },
    { name: 'published_at', type: 'date', required: true, index: true },
    { name: 'scheduled_at', type: 'date' },
    { name: 'priority', type: 'number', defaultValue: 0 },
    { name: 'importance', type: 'number', defaultValue: 0 },
    { name: 'display_score', type: 'number', defaultValue: 0, index: true },
    { name: 'simhash', type: 'text', index: true },
    { name: 'supersedes', type: 'relationship', relationTo: 'articles' },
    { name: 'topics', type: 'array', fields: [{ name: 'name', type: 'text' }] },
    { name: 'entities', type: 'array', fields: [{ name: 'name', type: 'text' }] },
    { name: 'featured_image', type: 'upload', relationTo: 'media' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    { name: 'editor', type: 'relationship', relationTo: 'users' },
  ],
}
