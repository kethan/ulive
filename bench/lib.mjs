// Adapts each library to one shape so the same scenario code runs on all of them.
const ULIVE = new URL('../dist/index.es.js', import.meta.url).href;

export const libs = {
  ulive: async () => {
    const m = await import(ULIVE + '?v=' + Math.random());
    return { name: 'ulive', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  // any build: ULIVE_MODULE=/path/to/index.es.js node --expose-gc bench.mjs file
  file: async () => {
    const m = await import(process.env.ULIVE_MODULE + '?v=' + Math.random());
    return { name: process.env.ULIVE_MODULE.split('/').pop(), signal: m.signal, computed: m.computed,
      effect: m.effect, batch: m.batch, get: (s) => s.value, set: (s, v) => s.value = v };
  },
  'ulive-lazy': async () => {
    const m = await import('./reactivity/ulive-lazy.es.js');
    return { name: 'ulive (pull)', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  'ulive-old': async () => {
    const m = await import('./ulive-closure.es.js');
    return { name: 'ulive (closure)', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  'ulive-tiny': async () => {
    const m = await import('../tiny/index.es.js');
    return { name: 'ulive/tiny', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  'ulive-tiny-fn': async () => {
    const m = await import('../tiny/fn/index.es.js');
    return { name: 'ulive/tiny/fn', signal: (v) => { const s = m.o(v); return { peek: s.peek, get value() { return s(); }, set value(x) { s(x) } }; },
      computed: (f) => { const c = m.memo(f); return { peek: c.peek, get value() { return c(); } }; },
      effect: m.effect, batch: m.batch, get: (s) => s.value, set: (s, v) => s.value = v };
  },
  preact: async () => {
    const m = await import('@preact/signals-core');
    return { name: 'preact/signals-core', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  usignal: async () => {
    const m = await import('usignal/sync');
    return { name: 'usignal/sync', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
  sprae: async () => {
    const m = await import('sprae/signal');
    return { name: 'sprae/signal', signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => s.value = v };
  },
};
