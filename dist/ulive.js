'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

let glue;

let signal = (val, n) => {
  n = o(val);
  return {
    get value() {
      return n();
    },
    set value(next) {
      n(next);
    },
    ...n
  };
};

let o = (val, listeners = new Set(), f) => {
  f = (...next) => {
    if (!next.length) {
      if (glue) listeners.add(glue);
      return val;
    }
    if (val !== next[0]) {
      val = next[0];
      for (let cb of listeners) {
        if (cb === glue) throw '1/10';
        cb && cb(val);
      }
    }
  };
  f.$o = 1;
  f.toJSON = f.then = f.toString = f.valueOf = () => val;
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

let memo = (cb, m = o()) => (effect(() => m(cb())), m);

let computed = (cb, m = signal()) => (effect(() => (m.value = cb())), m);

exports.computed = computed;
exports.effect = effect;
exports.memo = memo;
exports.o = o;
exports.signal = signal;
