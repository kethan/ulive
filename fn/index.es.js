let current, batched, flushing;

// Effects waiting for their turn. A write never runs anything: it marks the nodes that read it
// dirty and queues the effects that depend on them, so a value is recomputed at most once per
// cascade, when it is read (a diamond no longer recomputes its join once per path).
const queue = new Set;

// A node holds its value in `v`, its subscribers in `o`, its dependencies in `d` and a dirty flag
// in `st`. The class instances below are nodes, and so is the callable of the function flavour;
// an effect is the plain object built in `effect`.
const track = (n) => current && (current.d.add(n), (n.o ||= new Set).add(current));

// Mark the subscribers of a written signal dirty: effects are queued, computeds only propagate.
// An effect is the only node with an `f` (alive) flag, so it is also the only one that runs.
const dirty = (n) => n.f !== undefined
  ? n.f && queue.add(n)
  : n.st || ((n.st = 1), n.o && n.o.forEach(dirty));

const fire = (n) => n.o && n.o.forEach(dirty);

// recompute a dirty node once, dropping the subscriptions it no longer reads
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

const effect = (fn, fx) => (
  fx = { fn, f: 1, d: new Set },
  run(fx),
  () => {
    if (fx.f) {
      fx.f = 0, fx.t?.call?.(), fx.t = 0;
      // release every subscription the effect holds
      for (const dep of fx.d) dep.o.delete(fx);
      fx.d = 0;
    }
  }
);

// ---- function flavour: the callable is the signal ----

const oShare = (s) => (s.toJSON = s.toString = s.valueOf = s.then = (res) => res ? res(s()) : s(), s);

const o = (v, f) => oShare(
  f = (...next) => {
    if (!next.length) return track(f), v;
    Object.is(next[0], v) || ((v = next[0]), fire(f), batched || flush());
  },
  // peek never subscribes
  f.peek = () => v
);

const memo = (fn, f) => oShare(
  f = (...next) => {
    if (!next.length) return f.st && compute(f), track(f), f.v;
  },
  f.fn = fn, f.st = 1,
  // peek never subscribes, but still recomputes
  f.peek = () => untracked(() => f())
);

export { batch, effect, memo, o, untracked };
