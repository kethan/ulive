let current, batched;

const oShare = (s) => {
  s.toJSON = s.toString = s.valueOf = s.then = (res) => res ? res(s()) : s();
  return s;
};

const o = (v, obs = new Set(), f) => oShare(
  f = (...next) => {
    if (!next.length) {
      current?.deps.push(obs.add(current));
      return v;
    }
    if (!Object.is(v, next[0])) {
      v = next[0];
      for (const sub of [...obs]) batched ? batched.add(sub) : sub(v);
    }
  },
  f.peek = () => v
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

const memo = (fn, s = o(), c, e, r) => oShare(
  c = (...next) => {
    if (!next.length) {
      if (r) throw Error('circular');
      if (!e) {
        r = 1;
        try { e = effect(() => s(fn())); } finally { r = 0; }
      }
      return s();
    }
  },
  // peek never subscribes, but still initializes
  c.peek = () => untracked(() => c())
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
          if (++i > 1e3) throw Error('depth');
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

export { batch, effect, memo, o, untracked };
