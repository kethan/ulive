let current, batched;

// share value getters: toJSON/valueOf/toString for coercion, then() for `await`
// then() keeps returning the value when called without a resolver
const sigShare = (s) => {
  s.toJSON = s.toString = s.valueOf = s.then = (res) => res ? res(s.value) : s.value;
  return s;
};

const signal = (v, s, obs = new Set) => sigShare(
  {
    get value() {
      current?.deps.push(obs.add(current));
      return v;
    },
    set value(val) {
      if (Object.is(val, v)) return;
      v = val;
      for (let sub of obs) batched ? batched.add(sub) : sub();
    },
    peek: () => v,
  }
);

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

const computed = (fn, s = signal(), c, e, r) => sigShare(
  c = {
    get value() {
      if (r) throw new RangeError('circular dependency');
      if (!e) {
        r = 1;
        try { e = effect(() => s.value = fn()); } finally { r = 0; }
      }
      return s.value;
    },
    peek: () => untracked(() => c.value)
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
        // keep batching while flushing, so effects queued by effects are deduped
        // (iterating the live set also picks up effects queued during the flush)
        for (const fx of fxs) {
          if (++i > 1e3) throw new RangeError('depth');
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

export { batch, computed, effect, signal, untracked };
