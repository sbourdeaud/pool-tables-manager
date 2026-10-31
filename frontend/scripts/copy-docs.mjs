import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Copy repository-level documentation into the served public folder so the
// in-app Help page can render it (the Docker build context is backend/ only).
// Every USER_GUIDE*.md variant is published: USER_GUIDE.md -> user-guide.md,
// USER_GUIDE.fr.md -> user-guide.fr.md, and so on.
const candidates = [
  process.env.DOCS_SOURCE_DIR,
  resolve(process.cwd(), '..'),
  resolve(process.cwd(), '../..'),
].filter(Boolean)

const sourceDir = candidates.map((dir) => resolve(dir)).find((dir) => existsSync(resolve(dir, 'USER_GUIDE.md')))
if (!sourceDir) {
  console.warn('[copy-docs] USER_GUIDE.md not found next to the frontend — skipping help content copy')
  process.exit(0)
}

const outBase = process.env.DOCS_OUT_DIR || resolve(process.cwd(), '../backend/public')
const files = readdirSync(sourceDir).filter((name) => name.startsWith('USER_GUIDE') && name.endsWith('.md'))
mkdirSync(resolve(outBase, 'help'), { recursive: true })
for (const name of files) {
  const suffix = name.replace(/^USER_GUIDE/, '').replace(/\.md$/, '')
  const target = resolve(outBase, `help/user-guide${suffix}.md`)
  copyFileSync(resolve(sourceDir, name), target)
  console.log(`[copy-docs] ${resolve(sourceDir, name)} -> ${target}`)
}
