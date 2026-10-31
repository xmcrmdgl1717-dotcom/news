import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { Articles } from './collections/Articles'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Sections } from './collections/Sections'

export default buildConfig({
  admin: { user: 'users' },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET!,
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI! },
  }),
  collections: [Articles, Media, Users, Sections],
  typescript: {
    outputFile: path.resolve(__dirname, 'payload-types.ts'),
  },
})
