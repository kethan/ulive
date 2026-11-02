let current, batched, flushing;

const queue = new Set;

// A node holds its value in `v`, its subscribers in `o`, its dependencies in `d` and a dirty
// flag in `st`. A write only marks nodes dirty and queues the effects that depend on them, so a
// value is recomputed at most once per cascade, when it is read. Nodes are the class instances
// below (signal/computed) or the callable of the function flavour; an effect is a plain object.

const track = (n) => current && (current.d.add(n), (n.o ||= new Set).add(current));

// mark the subscribers of a written signal dirty: effects are queued, computeds are marked
const dirty = (n) => n.f !== undefined
  ? n.f && queue.add(n)
  : n.st || ((n.st = 1), n.o && n.o.forEach(dirty));

const fire = (n) => n.o && n.o.forEach(dirty);

const compute = (n, prev, old) => {
  if (n.r) throw Error('circular'); // re-entered while computing: a cycle
  n.r = 1, prev = current, old = n.d, n.d = new Set, current = n;
  try { n.v = n.fn(), n.st = 0; } finally { n.r = 0, current = prev; }
  old?.forEach((dep) => n.d.has(dep) || dep.o.delete(n));
};

const run = (fx, prev, old) => {
  fx.t?.call?.(), fx.t = 0;
  old = fx.d, fx.d = new Set, prev = current, current = fx;
  try { fx.t = fx.fn(); } finally { current = prev; }
  old.forEach((dep) => fx.d.has(dep) || dep.o.delete(fx));
};

// A write made while a cascade is running joins that cascade instead of recursing into it.
const flush = (i = 0) => {
  if (!flushing)
    try {
      flushing = 1;
      for (; queue.size;) {
        if (++i > 1e5) throw Error('depth');
        const fx = queue.values().next().value;
        queue.delete(fx);
        fx.f && run(fx); // an effect disposed by an earlier one is skipped
      }
    } finally { flushing = 0, queue.clear(); }
};

const batch = (fn, prev = batched) => {
  batched = 1;
  try { return fn() } finally { prev || ((batched = 0), flush()); }
};

const untracked = (fn, prev) => {
  prev = current, current = null;
  try { return fn() } finally { current = prev; }
};

const effect = (fn, teardown, fx) => (
  fx = { fn, f: 1, d: new Set },
  run(fx),
  () => fx.f && ((fx.f = 0), fx.t?.call?.(), fx.t = 0, fx.d.forEach((dep) => dep.o.delete(fx)), fx.d = 0)
);

class Signal {
  constructor(v) { this.v = v; }
  get value() { track(this); return this.v }
  set value(x) { Object.is(x, this.v) || ((this.v = x), fire(this), batched || flush()); }
  peek() { return this.v }
  then(res) { const v = this.value; return res ? res(v) : v }
  toJSON() { return this.value }
  valueOf() { return this.value }
  toString() { return String(this.value) }
}

class Computed extends Signal {
  constructor(fn) { super(); this.fn = fn; this.st = 1; }
  get value() { this.st && compute(this), track(this); return this.v }
  peek() { return untracked(() => this.value) }
}

const signal = (v) => new Signal(v);

const computed = (fn) => new Computed(fn);

export { batch, computed, effect, signal, untracked };
