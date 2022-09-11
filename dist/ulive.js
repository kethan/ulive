'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let glue;
let batches;
let batch = (fn, prev) => {
  prev = batches;
  batches = new Set();
  try {
    fn();
    for (let fn of batches) prev ? prev.add(fn) : fn();
  } finally {
    batches = prev;
  }
};

let signal = (val, n) => {
  n = o(val);
  return {
    get value() {
      return n();
    },
    set value(next) {
      n(next);
    },
    peek: n.peek,
    subscribe: n.subscribe
  };
};

let o = (val, listeners = new Set(), f) => {
  f = (next) => {
    if (!next) {
      if (glue) listeners.add(glue);
      return val;
    }
    if (val !== next) {
      val = next;
      for (let cb of listeners) {
        if (cb === glue) throw "1/10";
        batches ? batches.add(cb) : cb(val);
      }
    }
  };
  f.peek = () => val;
  f.subscribe = (cb) => {
    listeners.add(cb);
    cb(val);
    return () => listeners.delete(cb);
  };
  return f;
};
let effect = (fn, prev) => {
  prev = glue;
  glue = fn;
  try {
    fn();
  } finally {
    glue = prev;
  }
};
let memo = (cb, m) => {
  m = o();
  effect(() => m(cb()));
  return m;
};
let computed = (cb, m) => {
  m = signal();
  effect(() => (m.value = cb()));
  return m;
};

exports.batch = batch;
exports.computed = computed;
exports.effect = effect;
exports.memo = memo;
exports.o = o;
exports.signal = signal;
