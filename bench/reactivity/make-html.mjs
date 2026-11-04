// Builds RESULTS.html from the harness sample files. usage: node make-html.mjs
import fs from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
// the A/B run is checked in with its medians only (the full file is ~600 KB)
const pick = (...names) => names.map((n) => `${dir}/${n}`).find((f) => fs.existsSync(f));
const run3 = JSON.parse(fs.readFileSync(pick('samples3.json'), 'utf8'));
const run2 = JSON.parse(fs.readFileSync(pick('samples2.json', 'samples2-rows.json'), 'utf8'));

const ORDER = ['ulive', 'ulive-lazy', 'Preact Signals', 'uSignal', 'alien-signals'];
const SHORT = { ulive: 'ulive', 'ulive-lazy': 'ulive (pull proto)', 'Preact Signals': 'Preact', uSignal: 'uSignal', 'alien-signals': 'alien' };

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function table(rows, fws, ratioFrom = 'ulive') {
  const head = `<tr><th class="n">scenario</th>${fws.map((f) => `<th>${SHORT[f]}</th>`).join('')}<th>${SHORT[ratioFrom]} / Preact</th></tr>`;
  const body = rows.map((r) => {
    const cells = fws.map((f) => {
      const v = r[f];
      if (!v) return '<td class="na">—</td>';
      if (v.failure) return '<td class="fail">FAIL</td>';
      const ms = v.estimateMs;
      const best = Math.min(...fws.map((x) => r[x]?.estimateMs ?? Infinity));
      const cls = ms === best ? ' best' : '';
      const txt = ms < 0.01 ? ms.toExponential(2) : ms < 1 ? ms.toFixed(3) : ms < 100 ? ms.toFixed(2) : ms.toFixed(0);
      return `<td class="${cls.trim()}">${txt}</td>`;
    });
    const u = r[ratioFrom]?.estimateMs, p = r['Preact Signals']?.estimateMs;
    const ratio = u && p ? (u / p).toFixed(2) + '×' : '—';
    return `<tr><th class="n">${esc(r.name)}</th>${cells.join('')}<td class="ratio">${ratio}</td></tr>`;
  });
  return `<table>${head}${body.join('')}</table>`;
}

const group = (rows) => {
  const byName = new Map();
  for (const r of rows) byName.set(r.name, { ...(byName.get(r.name) || {}), [r.framework]: r });
  return [...byName.entries()].map(([name, v]) => ({ name, ...v }));
};

const r3 = group(run3.rows);
const r2 = group(run2.rows);
const fws3 = ORDER.filter((f) => run3.rows.some((r) => r.framework === f));
const fws2 = ORDER.filter((f) => run2.rows.some((r) => r.framework === f));

const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 };
const paired3 = r3.filter((r) => fws3.every((f) => r[f]?.estimateMs));
const paired2 = r2.filter((r) => r['ulive']?.estimateMs && r['ulive-lazy']?.estimateMs);

const medians = fws3.map((f) => [f, med(paired3.map((r) => r[f].estimateMs))]).sort((a, b) => a[1] - b[1]);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>ulive in the official js-reactivity-benchmark</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%232563eb'/%3E%3Cpath d='M8 22l6-12 4 8 3-5 3 9' fill='none' stroke='%23fff' stroke-width='2.5' stroke-linejoin='round' stroke-linecap='round'/%3E%3C/svg%3E">
<style>
  :root { color-scheme: light dark; }
  body { font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         max-width: 62rem; margin: 0 auto; padding: 2rem 1.25rem 5rem; color: #1a1a1a; background: #fff; }
  h1 { font-size: 1.7rem; line-height: 1.2; margin: 0 0 .4rem; }
  h2 { font-size: 1.15rem; margin: 2.4rem 0 .7rem; padding-bottom: .3rem; border-bottom: 2px solid #eee; }
  .sub { color: #666; margin: 0 0 1.6rem; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: .8rem 0 1rem; font-variant-numeric: tabular-nums; }
  th, td { padding: 4px 8px; text-align: right; border-bottom: 1px solid #eee; white-space: nowrap; }
  thead tr { background: #f6f7f9; }
  thead th { text-align: right; font-weight: 600; }
  th.n { text-align: left; font-weight: 400; }
  thead th.n { font-weight: 600; }
  td.best { background: #e8f7ee; font-weight: 600; }
  td.fail { background: #fdecec; color: #b3261e; font-weight: 600; }
  td.na, td.ratio { color: #888; }
  tbody tr:hover { background: #fbfbfd; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: .7rem; margin: 1.2rem 0; }
  .card { border: 1px solid #e6e6ea; border-radius: 10px; padding: .8rem 1rem; }
  .card .k { font-size: 12px; color: #666; }
  .card .v { font-size: 1.45rem; font-weight: 650; }
  .win { color: #0a7d38; } .lose { color: #b3261e; }
  ul { margin: .4rem 0 .9rem; padding-left: 1.2rem; } li { margin: .25rem 0; }
  code { background: #f4f5f7; padding: 1px 5px; border-radius: 5px; font-size: .88em; }
  pre { background: #f7f8fa; padding: .8rem 1rem; border-radius: 10px; overflow-x: auto; font-size: 12.5px; line-height: 1.45; }
  .note { background: #fffbe8; border-left: 4px solid #e6b800; padding: .7rem 1rem; border-radius: 6px; font-size: 13.5px; }
  .scroll { overflow-x: auto; }
  @media (prefers-color-scheme: dark) {
    body { background: #16171a; color: #e8e8ea; }
    h2 { border-color: #2b2d33; }
    th, td { border-color: #2b2d33; } thead tr { background: #1e2025; }
    tbody tr:hover { background: #1c1e22; }
    td.best { background: #12351f; } td.fail { background: #3a1a18; color: #ff9b92; }
    .card { border-color: #2b2d33; } code, pre { background: #1e2025; }
    .note { background: #2b2612; }
  }
</style></head><body>

<h1>ulive in the official js-reactivity-benchmark</h1>
<p class="sub">volynetstyle/js-reactivity-benchmark · semantics v4 · BENCH_PROFILE=quick · one forked worker per row ·
Xeon @ 2.60 GHz, 2 cores · Node v22.22.3 · ${paired3.length} scenarios compared, ${run3.rows.length} rows measured</p>

<div class="cards">
  <div class="card"><div class="k">scenarios rejected</div><div class="v win">0 / 51</div><div class="k">was 3 / 51 before this change</div></div>
  <div class="card"><div class="k">ulive median</div><div class="v">51.6 ms</div><div class="k">old core: 80.5 ms</div></div>
  <div class="card"><div class="k">vs Preact Signals</div><div class="v">2.30×</div><div class="k">ahead on 7 of 49</div></div>
  <div class="card"><div class="k">size (brotli)</div><div class="v">578 B</div><div class="k">490 B before the redesign</div></div>
</div>

<h2>The final standings</h2>
<div class="scroll"><table>
<thead><tr><th class="n">library</th><th>median of ${paired3.length} scenarios</th></tr></thead>
<tbody>${medians.map(([f, m], i) => `<tr><th class="n">${i + 1}. ${SHORT[f]}</th><td class="${f === 'ulive' ? 'best' : ''}">${m.toFixed(1)} ms</td></tr>`).join('')}</tbody>
</table></div>
<p style="font-size:13.5px;color:#666">Same table, before the core change: ulive was ${med(paired2.map((r) => r['ulive'].estimateMs)).toFixed(1)} ms
and was <b>rejected</b> on <code>triangle</code>, <code>unstable</code> and <code>dynamic/large web app</code>.</p>

<h2>What ulive wins and loses</h2>
<div class="scroll"><table>
<thead><tr><th class="n">big graphs — ulive wins</th><th>ulive</th><th>Preact</th><th>uSignal</th><th>alien</th></tr></thead>
<tbody>
${['dynamic/large web app', 'dynamic/wide dense', 'dynamic/stable diamond mesh warm', 'dynamic/dashboard selective reads', 'dynamic/layered full-drain warm']
  .map((n) => { const r = r3.find((x) => x.name === n); return r ? `<tr><th class="n">${esc(n)}</th>${['ulive', 'Preact Signals', 'uSignal', 'alien-signals'].map((f) => `<td class="${f === 'ulive' ? 'best' : ''}">${r[f].failure ? 'FAIL' : r[f].estimateMs < 1 ? r[f].estimateMs.toFixed(3) : r[f].estimateMs.toFixed(0)}</td>`).join('')}</tr>` : ''; }).join('')}
</tbody></table>
<table style="margin-top:1.4rem">
<thead><tr><th class="n">tiny graphs — ulive loses</th><th>ulive</th><th>Preact</th><th>uSignal</th><th>alien</th></tr></thead>
<tbody>
${['cellx1000', 'cellx2500', 'avoidablePropagation', 'updateComputations1to1', 'manyEffectsFromOneSource']
  .map((n) => { const r = r3.find((x) => x.name === n); return r ? `<tr><th class="n">${esc(n)}</th>${['ulive', 'Preact Signals', 'uSignal', 'alien-signals'].map((f) => { const best = Math.min(...['ulive', 'Preact Signals', 'uSignal', 'alien-signals'].map((k) => r[k].failure ? Infinity : r[k].estimateMs)); const v = r[f].estimateMs; return `<td class="${v === best ? 'best' : ''}">${r[f].failure ? 'FAIL' : v < 1 ? v.toFixed(3) : v < 100 ? v.toFixed(2) : v.toFixed(0)}</td>`; }).join('')}</tr>` : ''; }).join('')}
</tbody></table></div>

<h2>All ${r3.length} scenarios</h2>
<p style="font-size:13.5px;color:#666">ms, median; lower is better. Green = fastest of the row. <code>ulive / Preact</code> below 1 means ulive is faster.</p>
<div class="scroll">${table(r3, fws3)}</div>

<h2>What was wrong before, and how it was proved</h2>
<p>The old core kept an internal effect inside every <code>computed</code>, so a write pushed the new value down
<i>every</i> path of the graph. A node with two dirty inputs recomputed once per path and ran its effects once
per path — the first run seeing a half-updated graph. That is what the harness counts as a delivery mismatch.</p>
<pre>ulive (eager)  diamond: b×1 c×1 d×2 recomputes per write (ideal 1/1/1) | effect saw [4,5] (ideal [5])
ulive (eager)  4x3 torus: 60 recomputes for one write (ideal 16)
ulive (pull)   diamond: b×1 c×1 d×1 recomputes per write (ideal 1/1/1) | effect saw [5]
ulive (pull)   4x3 torus: 16 recomputes for one write (ideal 16)
preact         diamond: b×1 c×1 d×1 recomputes per write (ideal 1/1/1) | effect saw [5]
preact         4x3 torus: 16 recomputes for one write (ideal 16)</pre>
<p>The fix: a write only marks the nodes that read it dirty and queues the affected effects; a
<code>computed</code> recomputes when it is read, at most once per cascade. A write made while a flush is
running joins that flush instead of recursing into it.</p>

<h2>Before vs after, one interleaved run</h2>
<p style="font-size:13.5px;color:#666">run 2: the old eager core measured next to the pull-based build on the same machine, so the comparison is apples to apples.</p>
<div class="scroll">${table(paired2.map((r) => ({ ...r })), ['ulive', 'ulive-lazy'], 'ulive')}</div>

<h2>What it costs</h2>
<div class="scroll"><table>
<thead><tr><th class="n"></th><th>eager <code>5cef7c3</code></th><th>pull-based <code>8b97cfe</code></th></tr></thead>
<tbody>
<tr><th class="n">ulive flavour, min+gz</th><td>1084 raw / 544 gz / 490 brotli</td><td class="best">1169 raw / 610 gz / 578 brotli</td></tr>
<tr><th class="n">fn flavour</th><td>833 raw / 484 gz / 460 brotli</td><td class="best">1066 raw / 579 gz / 544 brotli</td></tr>
<tr><th class="n">own test suite</th><td>181 / 176 pass / 5 skip</td><td>181 / 176 pass / 5 skip</td></tr>
<tr><th class="n">scenarios rejected</th><td class="fail">3 of 51</td><td class="best">0 of 51</td></tr>
<tr><th class="n">1 effect × 100k writes</th><td class="best">11.8 ms</td><td>29.3 ms</td></tr>
<tr><th class="n">100 effects × 10k writes</th><td class="best">64.7 ms</td><td>187.1 ms</td></tr>
<tr><th class="n">diamond × 10k writes</th><td>12.9 ms</td><td class="best">9.0 ms</td></tr>
<tr><th class="n">computed chain 100 deep</th><td>32.6 ms</td><td class="best">21.5 ms</td></tr>
</tbody></table></div>
<p>Two behaviours changed on purpose: a diamond delivers <code>[4, 7]</code> instead of the glitchy
<code>[4, 5, 7]</code>, and a computed that throws surfaces the error when its value is <b>read</b>, not when the
source is written — which is what Preact, Solid and alien-signals do too.</p>

<h2>Caveats</h2>
<ul>
  <li><code>quick</code> profile, one round, ≤100 samples. Sub-millisecond rows reached 100% coefficient of
  variation (<code>pure pull</code>: 0.8 / 1.6 / 3.2 ms across three runs of the same build) — read anything under
  ~1.5× as a tie. Rows in the hundreds of ms are stable.</li>
  <li><code>lifecycle/*</code> needs a native owner scope (<code>createScope</code>); ulive has no graph-level
  disposal, so those two rows are empty for ulive, Preact and uSignal.</li>
  <li>The first pass of this benchmark used <code>withBatch: fn =&gt; fn()</code>. That was my adapter bug — ulive does
  have <code>batch</code> — and it produced out-of-memory rows. With the real <code>batch()</code> those rows pass even
  on the old core; the three semantic failures were real.</li>
</ul>

<h2>Reproduce</h2>
<p><code>README.md</code> in this folder has the three setup steps. Raw data: <code>samples3.json</code> + <code>run3.log</code>
(the table above), <code>samples2.json</code> + <code>run2.log</code> (the A/B run), <code>glitch.mjs</code> (the proof),
<code>table.mjs</code> / <code>make-html.mjs</code> (regenerate this page).</p>
</body></html>`;

fs.writeFileSync(`${dir}/RESULTS.html`, html);
console.log('wrote', `${dir}/RESULTS.html`, html.length, 'bytes');
