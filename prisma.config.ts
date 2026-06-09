import { loadEnvLocal } from './lib/load-env.js'
import { defineConfig, env } from 'prisma/config'

loadEnvLocal()

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
