/**
 * Load environment variables from the single project file: .env.local
 * Use this in Prisma, socket-server, workers, and tests (Next.js loads it automatically).
 */
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const PROJECT_ROOT = path.resolve(__dirname, '..')

const ENV_FILE = path.join(PROJECT_ROOT, '.env.local')

let loaded = false

export function loadEnvLocal() {
  if (loaded) return process.env

  if (!fs.existsSync(ENV_FILE)) {
    console.warn(
      `[env] Missing ${ENV_FILE}. Copy variables from the comment block in that file or ask your team for values.`
    )
    loaded = true
    return process.env
  }

  dotenv.config({ path: ENV_FILE })
  loaded = true
  return process.env
}

/** @returns {string} Absolute path to .env.local */
export function getEnvLocalPath() {
  return ENV_FILE
}
