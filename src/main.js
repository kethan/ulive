let current, batched;

const sigShare = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s.value;
  return s;
};

const oShare = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s();
  return s;
};


export const o = (v, obs = new Set(), f) => oShare(
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
)

export const signal = (v, s, obs = new Set) => sigShare(
  s = {
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

export const effect = (fn, teardown, fx, deps) => (
  fx = (prev) => {
    teardown?.call?.();
    prev = current, current = fx;
    try { teardown = fn(); } finally { current = prev; }
  },
  deps = fx.deps = [],
  fx(),
  (dep) => { teardown?.call?.(); while (dep = deps.pop()) dep.delete(fx); }
);

export const memo = (fn, s = o(), c, e) => oShare(
  c = (...next) => {
    if (!next.length) {
      e ||= effect(() => s(fn()));
      return s();
    }
  },
  c.peek = s.peek
);

export const computed = (fn, s = signal(), c, e) => sigShare(
  c = {
    get value() {
      e ||= effect(() => s.value = fn());
      return s.value;
    },
    peek: s.peek
  }
);

export const batch = (fn) => {
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

export const untracked = (fn, prev, v) => (prev = current, current = null, v = fn(), current = prev, v);