import { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'writer',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Writer', value: 'writer' },
      ],
    },
  ],
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req, id }) => {
      if (req.user?.role === 'admin') return true
      return req.user?.id === id
    },
  },
}
