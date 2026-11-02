'use strict';

let current, batched, flushing;

// Effects waiting for their turn. A write never runs anything: it marks the nodes that read it
// dirty and queues the effects that depend on them, so a value is recomputed at most once per
// cascade, when it is read (a diamond no longer recomputes its join once per path).
const queue = new Set;

// A node holds its value in `v`, its subscribers in `o`, its dependencies in `d`, a dirty flag in
// `st` and, when it is a computed, its producer in `fn`. The class instances below are nodes, and
// so is the callable of the function flavour; an effect is the plain object built in `effect`.
const track = (n) => current && (current.d.add(n), (n.o ||= new Set).add(current));

// Mark the subscribers of a written signal dirty: effects are queued, computeds only propagate.
// An effect is the only node with an `f` (alive) flag, so it is the only one that gets queued.
const dirty = (n) => n.f
  ? queue.add(n)
  : n.st || ((n.st = 1), n.o && n.o.forEach(dirty));

const fire = (n) => n.o && n.o.forEach(dirty);

// drop the subscriptions a node no longer reads
const prune = (n, old) => old?.forEach((dep) => n.d.has(dep) || dep.o.delete(n));

// run a node's producer with `current` pointing at it, then drop its stale subscriptions
const exec = (n, prev, old) => {
  old = n.d, n.d = new Set, prev = current, current = n;
  try { return n.fn() } finally { current = prev, prune(n, old); }
};

// recompute a dirty node once
const compute = (n) => {
  if (n.r) throw Error('circular'); // re-entered while computing: a cycle
  n.r = 1;
  try { n.v = exec(n), n.st = 0; } finally { n.r = 0; }
};

// the teardown is cleared before the body runs, so a body that throws cannot leak it into the
// next run
const run = (fx) => (fx.t?.call?.(), fx.t = 0, fx.t = exec(fx));

// A write made while a cascade is running joins that cascade instead of recursing into it.
const flush = (fx, i = 0) => {
  if (!flushing)
    try {
      for (flushing = 1; queue.size;) {
        if (++i > 1e5) throw Error('depth');
        fx = queue.values().next().value;
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
  fx = { fn, f: 1 }, // no dependency set yet: `exec` allocates it
  run(fx),
  () => fx.f && (
    fx.f = 0, fx.t?.call?.(), fx.t = 0,
    // release every subscription the effect holds
    fx.d.forEach((dep) => dep.o.delete(fx)), fx.d = 0
  )
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
  f.peek = () => untracked(f)
);

exports.batch = batch;
exports.effect = effect;
exports.memo = memo;
exports.o = o;
exports.untracked = untracked;
