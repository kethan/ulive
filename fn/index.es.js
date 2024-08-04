let current, batched;

const oShare = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s();
  return s;
};


const o = (v, obs = new Set(), f) => oShare(
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

export { batch, effect, memo, o, untracked };
