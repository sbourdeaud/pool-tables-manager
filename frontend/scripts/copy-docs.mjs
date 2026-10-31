import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Copy repository-level documentation into the served public folder so the
// in-app Help page can render it (the Docker build context is backend/ only).
const candidates = [
  process.env.DOCS_SOURCE_DIR,
  resolve(process.cwd(), '..'),
  resolve(process.cwd(), '../..'),
].filter(Boolean)

const source = candidates.map((dir) => resolve(dir, 'USER_GUIDE.md')).find((file) => existsSync(file))
if (!source) {
  console.warn('[copy-docs] USER_GUIDE.md not found next to the frontend — skipping help content copy')
  process.exit(0)
}

const outBase = process.env.DOCS_OUT_DIR || resolve(process.cwd(), '../backend/public')
const target = resolve(outBase, 'help/user-guide.md')
mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`[copy-docs] ${source} -> ${target}`)
