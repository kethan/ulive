import { libs } from './lib.mjs';

const which = process.argv[2];
const L = await libs[which]();
const { signal, computed, effect, batch, get, set } = L;
let sink = 0;

const scenarios = {
  'create 100k signals': () => {
    const a = [];
    for (let i = 0; i < 1e5; i++) a.push(signal(i));
    return a.length;
  },
  '100k signals + effect + write': () => {
    const a = [], offs = [];
    for (let i = 0; i < 1e5; i++) {
      const s = signal(0);
      offs.push(effect(() => { sink += get(s) }));
      a.push(s);
    }
    for (const s of a) set(s, 1);
    return sink & 1;
  },
  '1 signal read 1M times': () => {
    const s = signal(1);
    let x = 0;
    for (let i = 0; i < 1e6; i++) x += get(s);
    return x;
  },
  '1 signal 1 effect 100k writes': () => {
    const s = signal(0);
    effect(() => { sink += get(s) });
    for (let i = 0; i < 1e5; i++) set(s, i);
    return sink & 1;
  },
  '1 signal 100 effects 10k writes': () => {
    const s = signal(0);
    for (let i = 0; i < 100; i++) effect(() => { sink += get(s) });
    for (let i = 0; i < 1e4; i++) set(s, i);
    return sink & 1;
  },
  'computed chain 100 deep 1k writes': () => {
    const a = signal(0);
    let c = computed(() => get(a));
    for (let i = 0; i < 100; i++) { const p = c; c = computed(() => get(p) + 1) }
    effect(() => { sink += get(c) });
    for (let i = 0; i < 1e3; i++) set(a, i);
    return sink & 1;
  },
  'diamond 2 levels 10k writes': () => {
    const a = signal(0);
    const b = computed(() => get(a) + 1);
    const c = computed(() => get(a) + 2);
    const d = computed(() => get(b) + get(c));
    effect(() => { sink += get(d) });
    for (let i = 0; i < 1e4; i++) set(a, i);
    return sink & 1;
  },
  '1k batches x 10 writes': () => {
    const sigs = Array.from({ length: 10 }, () => signal(0));
    sigs.forEach((s) => effect(() => { sink += get(s) }));
    for (let i = 0; i < 1e3; i++) batch(() => { for (const s of sigs) set(s, i) });
    return sink & 1;
  },
  'create+dispose 100k effects': () => {
    const s = signal(0);
    for (let i = 0; i < 1e5; i++) effect(() => { sink += get(s) })();
    return sink & 1;
  },
};

const results = {};
for (const [name, fn] of Object.entries(scenarios)) {
  const times = [];
  for (let r = 0; r < 3; r++) {
    sink = 0;
    const t = performance.now();
    fn();
    times.push(performance.now() - t);
    if (global.gc) global.gc();
  }
  results[name] = Math.min(...times);
}
console.log(JSON.stringify({ lib: L.name, results }));
