'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let current, batched;

const share = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s.value;
  return s;
};

const signal = (v, s, obs = new Set) => share(
  {
    get value() {
      current?.deps.push(obs.add(current));
      return v;
    },
    set value(val) {
      if (val === v) return;
      v = val;
      for (let sub of obs) batched ? batched.add(sub) : sub();
    },
    peek: () => v,
  }
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

const computed = (fn, s = signal(), c, e) => share(
  {
    get value() {
      e ||= effect(() => s.value = fn());
      return s.value;
    },
    peek: s.peek
  }
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
exports.computed = computed;
exports.effect = effect;
exports.signal = signal;
exports.untracked = untracked;
