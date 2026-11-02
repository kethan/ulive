// Aggregates krausest/run.mjs results into a table.
// usage: node krausest/report.mjs <results.jsonl> [runs2.jsonl ...]
import { readFileSync } from 'fs';

const files = process.argv.slice(2);
const rows = files.flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l)));

// one row per lib: median across processes of the per-process medians
const byLib = new Map();
for (const r of rows) {
  if (!byLib.has(r.lib)) byLib.set(r.lib, []);
  byLib.get(r.lib).push(r);
}
const ORDER = ['vanilla', 'ulive', 'ulive-old', 'preact', 'usignal', 'sprae'];
const libs = [...byLib.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[(s.length / 2) | 0] };

const scenarios = Object.keys(byLib.get(libs[0])[0].timing);
const val = (lib, s) => med(byLib.get(lib).map((r) => r.timing[s]));
const pad = (s, n) => String(s).padStart(n);
const fmt = (v) => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));

console.log(`js-framework-benchmark operations on jsdom, median of ${files.length} process(es) x 9 runs, ms\n`);
console.log('scenario'.padEnd(29) + libs.map((l) => pad(l, 11)).join('') + pad('best', 12));
for (const s of scenarios) {
  const vals = libs.map((l) => val(l, s));
  const best = Math.min(...vals);
  console.log(s.padEnd(29) + vals.map((v) => pad(fmt(v) + (v === best ? '*' : ''), 11)).join('') + pad(libs[vals.indexOf(best)], 12));
}

console.log('\nretained heap, 10k live rows (MB)');
console.log(''.padEnd(29) + libs.map((l) => pad(med(byLib.get(l).map((r) => r.memory)), 11)).join(''));

const van = libs.includes('vanilla') ? libs[libs.indexOf('vanilla')] : null;
if (van) {
  console.log('\nx plain DOM (vanilla = 1.00, lower is better)');
  const others = libs.filter((l) => l !== 'vanilla');
  console.log('scenario'.padEnd(29) + others.map((l) => pad(l, 11)).join(''));
  for (const s of scenarios) {
    console.log(s.padEnd(29) + others.map((l) => pad((val(l, s) / val(van, s)).toFixed(2) + 'x', 11)).join(''));
  }
}

console.log('\nnoise: inter-quartile spread as % of the median, worst scenario per lib');
for (const l of libs) {
  const worst = scenarios
    .map((s) => {
      const r = byLib.get(l)[0];
      const [lo, hi] = r.spread[s];
      return [s, ((hi - lo) / (r.timing[s] || 1)) * 100];
    })
    .sort((a, b) => b[1] - a[1])[0];
  console.log(' ', l.padEnd(10), `${worst[1].toFixed(0)}%  (${worst[0]})`);
}

const bad = rows.flatMap((r) => Object.entries(r.correct).filter(([, v]) => !v).map(([k]) => `${r.lib}: ${k}`));
console.log('\ncorrectness:', bad.length ? 'FAILED - ' + bad.join('; ') : `all ${scenarios.length} operations verified on every library`);
