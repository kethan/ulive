let current, batched;

const share = (s) => {
  s.toJSON = s.then = s.toString = s.valueOf = () => s.value;
  return s;
};

export const signal = (v, s, obs = new Set) => share(
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

export const computed = (fn, s = signal(), c, e) => share(
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