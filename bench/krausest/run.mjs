// Runs the js-framework-benchmark operations for one library in this process and prints JSON.
// usage: node --expose-gc krausest/run.mjs <lib> [runs]
import { JSDOM } from 'jsdom';
import { adapters, createSignalsApp, createVanillaApp, buildData } from './app.mjs';

const lib = process.argv[2];
const RUNS = Number(process.argv[3] || 9);

const dom = new JSDOM('<!doctype html><html><body><table><tbody></tbody></table></body></html>');
const { window } = dom;
const { document } = window;
const ctx = { document, tbody: document.querySelector('tbody') };

const time = (fn) => { const t = performance.now(); fn(); return performance.now() - t };
const stats = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return { med: s[(s.length / 2) | 0], lo: s[(s.length / 4) | 0], hi: s[((s.length * 3) / 4) | 0] };
};

const rowsInDom = () => ctx.tbody.children.length;
const ids = () => [...ctx.tbody.children].map((tr) => +tr.getAttribute('data-id'));
const danger = () => [...ctx.tbody.children].filter((tr) => tr.classList.contains('danger')).map((tr) => +tr.getAttribute('data-id'));
const cell = (id, n) => ctx.tbody.querySelector(`tr[data-id="${id}"]`)?.children[n]?.textContent;

// [name, setup, op, verify(app)]
const scenarios = [
  ['create 1k rows', () => {}, (app) => app.create(1000), () => rowsInDom() === 1000],
  ['replace all 1k rows', (app) => app.create(1000), (app) => app.create(1000), () => rowsInDom() === 1000 && ids()[0] === 1],
  ['update every 10th row (1k)', (app) => app.create(1000), (app) => app.updateEvery10th(),
    () => cell(10, 1).endsWith('*') && !cell(11, 1).endsWith('*') &&
          [...ctx.tbody.children].filter((tr) => tr.children[1].textContent.endsWith('*')).length === 100],
  ['select row (1k)', (app) => app.create(1000), (app) => { app.select(5); app.select(6) },
    () => { const d = danger(); return d.length === 1 && d[0] === 6 }],
  ['swap 2 rows (1k)', (app) => app.create(1000), (app) => app.swap(),
    () => ids()[1] === 999 && ids()[998] === 2 && rowsInDom() === 1000],
  ['remove row (1k)', (app) => app.create(1000), (app) => app.remove(500),
    () => rowsInDom() === 999 && !ids().includes(500)],
  ['create 10k rows', () => {}, (app) => app.create(10000), () => rowsInDom() === 10000],
  ['append 1k to 1k', (app) => app.create(1000), (app) => app.append(1000),
    () => rowsInDom() === 2000 && ids()[1999] === 2000],
  ['clear 1k rows', (app) => app.create(1000), (app) => app.clear(), () => rowsInDom() === 0],
];

const libApi = lib === 'vanilla' ? null : await adapters[lib]();
const newApp = () => (libApi ? createSignalsApp(ctx, libApi) : createVanillaApp(ctx));

const out = { lib, runs: RUNS, timing: {}, spread: {}, correct: {}, memory: 0, rows: 0 };

// warm-up over everything, so the JIT is warm before measuring
for (const [, setup, op] of scenarios) { const app = newApp(); setup(app); op(app) }

for (const [name, setup, op, verify] of scenarios) {
  const samples = [];
  let ok = true;
  for (let r = 0; r < RUNS; r++) {
    const app = newApp();
    setup(app);                        // not measured
    samples.push(time(() => op(app))); // measured
    if (r === 0) ok = !!verify(app);
  }
  const s = stats(samples);
  out.timing[name] = s.med;
  out.spread[name] = [s.lo, s.hi];
  out.correct[name] = ok;
}

// retained heap for 10k live rows (delta around the app, so the jsdom baseline drops out)
{
  global.gc?.();
  const base = process.memoryUsage().heapUsed;
  const app = newApp();
  app.create(10000);
  out.rows = rowsInDom();
  global.gc?.();
  out.memory = +((process.memoryUsage().heapUsed - base) / 1048576).toFixed(1);
}

console.log(JSON.stringify(out));
