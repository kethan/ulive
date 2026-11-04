// ulive/tiny - the original 1.x core, kept as-is for bundle size.
//
// It is not a subset of `ulive`: the behaviour differs in ways that matter, and those differences
// are the bugs `ulive` fixed. Read README.md ("ulive/tiny") before choosing it, and see
// test.js next to this file, which pins the behaviour below on purpose.
//
// Kept close to the published 1.0.7 build: reformatting here costs bytes in the output.

let current, batched;

const sigShare = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s.value;
  return s;
};

const signal = (v, s, obs = new Set) => sigShare(
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

const computed = (fn, s = signal(), c, e) => sigShare(
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

export { batch, computed, effect, signal, untracked };
