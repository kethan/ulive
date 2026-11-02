// A faithful mini version of the js-framework-benchmark (krausest) operations, run against
// whatever DOM the caller passes in. The renderer is written ONCE and parameterised by a
// signal adapter, so every library does byte-identical DOM work and only the reactivity
// layer differs. `vanilla` is the no-signals baseline from the benchmark.

export const adapters = {
  ulive: async () => {
    const m = await import('../../ulive/dist/index.es.js');
    return { signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => (s.value = v) };
  },
  'ulive-old': async () => {
    const m = await import('./ulive-closure.es.js');
    return { signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => (s.value = v) };
  },
  preact: async () => {
    const m = await import('../node_modules/@preact/signals-core/dist/signals-core.mjs');
    return { signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => (s.value = v) };
  },
  usignal: async () => {
    const m = await import('../node_modules/usignal/esm/sync.js');
    return { signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => (s.value = v) };
  },
  sprae: async () => {
    const m = await import('../node_modules/sprae/signal.js');
    return { signal: m.signal, computed: m.computed, effect: m.effect, batch: m.batch,
      get: (s) => s.value, set: (s, v) => (s.value = v) };
  },
};

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// the benchmark's data generator (identical to krausest's)
export const buildData = (count) => {
  const words = [];
  for (let i = 0; i < count; i++) {
    const w = [];
    for (let j = 0; j < 3; j++) w.push(A[(Math.random() * 26) | 0]);
    words.push(w.join(''));
  }
  const out = [];
  for (let i = 1; i <= count; i++) out.push({ id: i, label: `${words[i - 1]} !!!` });
  return out;
};

// ---------------------------------------------------------------- signals renderer
export function createSignalsApp(dom, lib) {
  const { signal, effect, batch, get, set } = lib;
  const { document, tbody } = dom;

  const rows = signal([]);
  const selected = signal(0);
  let rowViews = new Map(); // id -> { tr, td1, td2, off, label }
  let prevSelected = 0;

  const makeRow = (row) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.className = 'col-md-1';
    td2.className = 'col-md-4';
    const label = signal(row.label);
    td2.textContent = row.label;
    tr.appendChild(td1);
    tr.appendChild(td2);
    td1.textContent = row.id;
    tr.setAttribute('data-id', row.id);
    // per-row effect: an update to this row's label touches only this node
    const off = effect(() => { td2.textContent = get(label) });
    return { tr, td1, td2, label, off };
  };

  const render = () => {
    // structural change: build the new set, drop the old
    const list = get(rows);
    for (const view of rowViews.values()) view.off();
    rowViews = new Map();
    const frag = document.createDocumentFragment();
    for (const row of list) {
      const view = makeRow(row);
      rowViews.set(row.id, view);
      frag.appendChild(view.tr);
    }
    tbody.textContent = '';
    tbody.appendChild(frag);
  };

  // one effect owns selection: it only touches the row that lost it and the one that gained it
  effect(() => {
    const id = get(selected);
    rowViews.get(prevSelected)?.tr.classList.remove('danger');
    rowViews.get(id)?.tr.classList.add('danger');
    prevSelected = id;
  });

  return {
    // create / replace all
    create(count) { set(rows, buildData(count)), render() },
    append(count) {
      const list = get(rows);
      const next = buildData(count).map((r) => ({ id: r.id + list.length, label: r.label }));
      set(rows, list.concat(next));
      const frag = document.createDocumentFragment();
      for (const row of next) {
        const view = makeRow(row);
        rowViews.set(row.id, view);
        frag.appendChild(view.tr);
      }
      tbody.appendChild(frag);
    },
    updateEvery10th() {
      batch(() => {
        for (const [id, view] of rowViews) if (id % 10 === 0) set(view.label, `${get(view.label)} *`);
      });
    },
    select(id) { set(selected, id) },
    swap() {
      const list = get(rows);
      if (list.length < 999) return;
      const a = rowViews.get(list[1].id), b = rowViews.get(list[998].id);
      // swap the data and move the two DOM nodes, like a keyed framework would
      const next = list.slice();
      [next[1], next[998]] = [next[998], next[1]];
      set(rows, next);
      const marker = a.tr.nextSibling;
      tbody.insertBefore(a.tr, b.tr.nextSibling);
      tbody.insertBefore(b.tr, marker);
    },
    remove(id) {
      const view = rowViews.get(id);
      if (!view) return;
      view.off();
      view.tr.remove();
      rowViews.delete(id);
      set(rows, get(rows).filter((r) => r.id !== id));
    },
    clear() {
      for (const view of rowViews.values()) view.off();
      rowViews = new Map();
      set(rows, []);
      tbody.textContent = '';
    },
    count() { return rowViews.size },
  };
}

// ---------------------------------------------------------------- vanilla baseline
export function createVanillaApp(dom) {
  const { document, tbody } = dom;
  let rows = [];
  let selected = 0;
  let prevSelected = 0;
  const views = new Map();

  const makeRow = (row) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.className = 'col-md-1';
    td2.className = 'col-md-4';
    td1.textContent = row.id;
    td2.textContent = row.label;
    tr.setAttribute('data-id', row.id);
    tr.appendChild(td1);
    tr.appendChild(td2);
    return { tr, td1, td2 };
  };

  return {
    create(count) {
      views.clear();
      rows = buildData(count);
      const frag = document.createDocumentFragment();
      for (const row of rows) { const v = makeRow(row); views.set(row.id, v); frag.appendChild(v.tr) }
      tbody.textContent = '';
      tbody.appendChild(frag);
    },
    append(count) {
      const next = buildData(count).map((r) => ({ id: r.id + rows.length, label: r.label }));
      const frag = document.createDocumentFragment();
      for (const row of next) { const v = makeRow(row); views.set(row.id, v); frag.appendChild(v.tr) }
      rows = rows.concat(next);
      tbody.appendChild(frag);
    },
    updateEvery10th() {
      for (const [id, v] of views) if (id % 10 === 0) v.td2.textContent = `${v.td2.textContent} *`;
    },
    select(id) {
      views.get(prevSelected)?.tr.classList.remove('danger');
      views.get(id)?.tr.classList.add('danger');
      prevSelected = selected = id;
    },
    swap() {
      if (rows.length < 999) return;
      const a = views.get(rows[1].id), b = views.get(rows[998].id);
      [rows[1], rows[998]] = [rows[998], rows[1]];
      const marker = a.tr.nextSibling;
      tbody.insertBefore(a.tr, b.tr.nextSibling);
      tbody.insertBefore(b.tr, marker);
    },
    remove(id) {
      const v = views.get(id);
      if (!v) return;
      v.tr.remove();
      views.delete(id);
      rows = rows.filter((r) => r.id !== id);
    },
    clear() { views.clear(); rows = []; tbody.textContent = '' },
    count() { return views.size },
  };
}
