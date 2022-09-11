let glue;
let batches;
export let batch = (fn, prev) => {
  prev = batches;
  batches = new Set();
  try {
    fn();
    for (let fn of batches) prev ? prev.add(fn) : fn();
  } finally {
    batches = prev;
  }
};

export let signal = (val, n) => {
  n = o(val);
  return {
    get value() {
      return n();
    },
    set value(next) {
      n(next);
    },
    peek: n.peek,
    subscribe: n.subscribe,
  };
};

export let o = (val, listeners = new Set(), f) => {
  f = (...next) => {
    if (!next.length) {
      if (glue) listeners.add(glue);
      return val;
    }
    if (val !== next[0]) {
      val = next[0];
      for (let cb of listeners) {
        if (cb === glue) throw '1/10';
        batches ? batches.add(cb) : cb(val);
      }
    }
  };
  f.peek = () => val;
  f.subscribe = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  return f;
};
export let effect = (fn, prev) => {
  prev = glue;
  glue = fn;
  try {
    fn();
  } finally {
    glue = prev;
  }
};
export let memo = (cb, m) => {
  m = o();
  effect(() => {
    m(cb());
  });
  return m;
};
export let computed = (cb, m) => {
  m = signal();
  effect(() => (m.value = cb()));
  return m;
};