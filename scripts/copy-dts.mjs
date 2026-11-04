// Copies the hand-written typings next to each build.
//
// Replaces `copyfiles`, which pulled in glob@7 -> minimatch@3 -> brace-expansion (three advisories
// in the dev tree for two file copies). Node's own fs.cp does the whole job.
//
// Mirrors what the old scripts did:
//   copyfiles -u 1 "src/index.d.ts"          dist
//   copyfiles -u 1 "src/index.d.ts"          fn
//   copyfiles -u 2 "src/tiny/index.d.ts"     tiny
//   copyfiles -u 3 "src/tiny/fn/*.d.ts"      tiny/fn

import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// [source directory, destination directory] - every `*.d.ts` in the source is copied as-is
const copies = [
	['src', 'dist'],
	['src', 'fn'],
	['src/tiny', 'tiny'],
	['src/tiny/fn', 'tiny/fn'],
]

let n = 0
for (const [from, to] of copies) {
	mkdirSync(join(root, to), { recursive: true })
	for (const file of readdirSync(join(root, from))) {
		if (!file.endsWith('.d.ts')) continue
		copyFileSync(join(root, from, file), join(root, to, file))
		n++
	}
}
console.log(`copied ${n} typing files`)
