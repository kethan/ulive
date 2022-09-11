(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ulive = {}));
})(this, (function (exports) { 'use strict';

  /**
   * ISC License
   *
   * Copyright (c) 2022, Andrea Giammarchi, @WebReflection
   *
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   *
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
   * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
   * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
   * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
   * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
   * OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
   * PERFORMANCE OF THIS SOFTWARE.
   */

  /* MAIN */

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
          batches ? batches.add(cb) : cb(val);
        }
      }
    };
    f.peek = () => val;
    f.toString = () => val;
    f.valueOf = () => val;
    f.subscribe = (cb) => {
      listeners.add(cb);
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
    effect(() => {
      m(cb());
    });
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

  Object.defineProperty(exports, '__esModule', { value: true });

}));
