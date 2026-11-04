'use strict';

// ulive/tiny/fn - the original 1.x callable flavour, kept as-is for bundle size.
//
// Same caveat as ulive/tiny: this is the old implementation, not a subset of `ulive/fn`. The
// callable API carries the same defects as the object one (eager memos, no cycle or loop guard,
// glitchy diamonds) plus two of its own: `o(x)` returns undefined instead of the new value, and
// `memo.peek()` is undefined until the producer has run once. See ../README.md and test.fn.js.
//
// The shared machinery below is repeated from main.js on purpose: this file mirrors what 1.0.7
// published, and every entry point is bundled on its own, so the repetition costs nothing in
// the output - while main.js stays byte-identical to the released build.

let current, batched;

const oShare = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s();
  return s;
};

const o = (v, obs = new Set, f) => oShare(
  f = (...next) => {
    if (!next.length) {
      current?.deps.push(obs.add(current));
      return v;
    }
    if (v !== next[0]) {
      v = next[0];
      for (let sub of obs) batched ? batched.add(sub) : sub(v);
    }
  },
  f.peek = () => v
);

const effect = (fn, teardown, fx, deps) => (
  fx = (prev) => {
    teardown?.call?.();
    prev = current, current = fx;
    try { teardown = fn(); } finally { current = prev; }
  },
  deps = fx.deps = [],
  fx(),
  (dep) => { teardown?.call?.(); while (dep = deps.pop()) dep.delete(fx); }
);

const memo = (fn, s = o(), c, e) => oShare(
  c = (...next) => {
    if (!next.length) {
      e ||= effect(() => s(fn()));
      return s();
    }
  },
  c.peek = s.peek
);

const batch = (fn) => {
  let fxs = batched;
  if (!fxs) batched = new Set;
  try { fn(); } finally {
    if (!fxs) {
      fxs = batched;
      batched = null;
      for (const fx of fxs) fx();
    }
  }
};

const untracked = (fn, prev, v) => (prev = current, current = null, v = fn(), current = prev, v);

exports.batch = batch;
exports.effect = effect;
exports.memo = memo;
exports.o = o;
exports.untracked = untracked;
