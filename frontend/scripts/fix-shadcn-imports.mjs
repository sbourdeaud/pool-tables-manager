#!/usr/bin/env node
// shadcn CLI writes utility imports as `import { cn } from "cn"` (it does not
// apply the configured alias for the import specifier). Rewrite those to our
// package-import alias so CLI-generated components build without edits.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(process.cwd(), 'src', 'components', 'ui')
let fixed = 0
for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
  const path = join(dir, file)
  const before = readFileSync(path, 'utf8')
  const after = before.replaceAll('from "cn"', 'from "#lib/utils"').replaceAll("from 'cn'", "from '#lib/utils'")
  if (after !== before) {
    writeFileSync(path, after)
    fixed++
  }
}
console.log(`fix-shadcn-imports: patched ${fixed} file(s)`)
