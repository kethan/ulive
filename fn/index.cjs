'use strict';

let current, batched;

// Notify the subscribers that existed when the write started: an effect may subscribe new
// effects while it runs, and those must hear about the next write, not this one.
const fire = (obs) => {
  if (obs) for (const fx of [...obs]) batched ? batched.add(fx) : fx();
};

const effect = (fn, teardown, fx, deps) => (
  fx = (prev) => {
    if (!deps) return; // disposed (can still be queued by an open batch)
    teardown?.call?.();
    prev = current, current = fx;
    try { teardown = fn(); } finally { current = prev; }
  },
  deps = fx.deps = [],
  fx(),
  (dep) => {
    if (deps) {
      teardown?.call?.(), teardown = 0;
      while (dep = deps.pop()) dep.delete(fx);
      deps = 0;
    }
  }
);

const batch = (fn, fxs = batched, i = 0) => {
  if (!fxs) batched = new Set;
  try {
    return fn();
  } finally {
    if (!fxs) {
      fxs = batched;
      try {
        // keep the queue live while flushing: an effect queued by an effect runs once
        for (const fx of fxs) {
          if (++i > 1e5) throw Error('depth');
          fxs.delete(fx);
          fx();
        }
      } finally { batched = null; }
    }
  }
};

const untracked = (fn, prev) => {
  prev = current, current = null;
  try { return fn(); } finally { current = prev; }
};

// ---- function flavour: the callable is the signal ----

const oShare = (s) => (s.toJSON = s.toString = s.valueOf = s.then = (res) => res ? res(s()) : s(), s);

const o = (v, obs, f) => oShare(
  f = (...next) => next.length
    ? Object.is(next[0], v) || (v = next[0], fire(obs))
    : (current && (current.deps.push(obs ||= new Set), obs.add(current)), v),
  f.peek = () => v
);

const memo = (fn, s = o(), e, r, f) => oShare(
  f = (...next) => {
    if (next.length) return;
    if (r) throw Error('circular'); // re-entered while initializing: a cycle
    if (!e) {
      r = 1;
      try { e = effect(() => s(fn())); } finally { r = 0; }
    }
    return s();
  },
  // peek never subscribes, but still initializes
  f.peek = () => untracked(() => f())
);

exports.batch = batch;
exports.effect = effect;
exports.memo = memo;
exports.o = o;
exports.untracked = untracked;
