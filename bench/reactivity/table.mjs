import fs from 'node:fs';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || join(here, 'samples3.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
// column order, filtered to whichever frameworks the sample file actually contains
const ORDER = ['ulive', 'ulive-lazy', 'Preact Signals', 'uSignal', 'alien-signals'];
const FW = ORDER.filter((f) => d.rows.some((r) => r.framework === f));

const byName = new Map();
for (const r of d.rows) {
  if (!byName.has(r.name)) byName.set(r.name, { group: r.group, family: r.family });
  byName.get(r.name)[r.framework] = r;
}

const fmt = (v) => {
  if (v === undefined) return '—';
  if (v.failure || (v.validation && v.validation !== 'passed')) return '**FAIL**';
  const ms = v.estimateMs;
  if (ms === undefined) return '**FAIL**';
  if (ms < 0.01) return ms.toExponential(2);
  if (ms < 1) return ms.toFixed(3);
  if (ms < 100) return ms.toFixed(2);
  return ms.toFixed(0);
};

const names = [...byName.keys()];
// keep the harness's own ordering (baseline, fan, ..., dynamic, lifecycle)
const order = [];
for (const r of d.rows) if (!order.includes(r.name)) order.push(r.name);

let md = `# ulive in the official js-reactivity-benchmark\n\n`;
md += `Harness: \`volynetstyle/js-reactivity-benchmark\` v4 semantics, \`BENCH_PROFILE=quick\`, one isolated\n`;
md += `process per row, run on ${d.cpu} (${d.cores} cores), Node ${d.node}, ${d.platform}, gc=${d.gc}.\n`;
md += `Both ulive flavours use \`batch\` for \`withBatch\`; \`ulive-lazy\` is the pull-based prototype.\n`;
md += `Numbers are medians in ms (lower is better); **FAIL** = the harness's own semantic checks rejected the run.\n\n`;
const short = { ulive: 'ulive', 'ulive-lazy': 'ulive-lazy', 'Preact Signals': 'Preact', uSignal: 'uSignal', 'alien-signals': 'alien' };
md += `| scenario | ${FW.map((f) => short[f]).join(' | ')} | ulive / Preact |\n|---|${FW.map(() => '---:').join('|')}|---:|\n`;

let group = '';
for (const name of order) {
  const row = byName.get(name);
  if (row.group !== group) { group = row.group; }
  const u = row['ulive'], p = row['Preact Signals'];
  const ratio = u?.estimateMs && p?.estimateMs ? (u.estimateMs / p.estimateMs).toFixed(2) + '×' : '—';
  md += `| ${name} | ${FW.map((f) => fmt(row[f])).join(' | ')} | ${ratio} |\n`;
}

const fails = d.rows.filter((r) => r.failure || (r.validation && r.validation !== 'passed'));
md += `\n## Harness rejections\n\n`;
if (!fails.length) md += `none\n`;
for (const f of fails) {
  const reason = f.failure ? `${f.failure.kind}: ${f.failure.message}` : f.validation;
  md += `- **${f.framework}** · ${f.name} — ${reason}\n`;
}
if (process.argv.includes('--write')) fs.writeFileSync(join(here, 'RESULTS-generated.md'), md);
else process.stdout.write(md);
