(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ulive = {}));
})(this, (function (exports) { 'use strict';

  exports.current = void 0;
    let signal = (v, s, obs = new Set) => (
      s = {
        get value() {
          exports.current?.deps.push(obs.add(exports.current));
          return v
        },
        set value(val) {
          if (val === v) return
          v = val;
          for (let sub of obs) sub(val); // notify effects
        },
        peek() { return v },
      },
      s.toJSON = s.then = s.toString = s.valueOf = () => s.value,
      s
    ),
    effect = (fn, teardown, run, deps) => (
      run = (prev) => {
        teardown?.call?.();
        prev = exports.current, exports.current = run;
        try { teardown = fn(); } finally { exports.current = prev; }
      },
      deps = run.deps = [],

      run(),
      (dep) => { teardown?.call?.(); while (dep = deps.pop()) dep.delete(run); }
    ),
    computed = (fn, s = signal(), c, e) => (
      c = {
        get value() {
          e ||= effect(() => s.value = fn());
          return s.value
        },
        peek: s.peek
      },
      c.toJSON = c.then = c.toString = c.valueOf = () => c.value,
      c
    ),
    batch = (fn) => fn(),
    untracked = (fn, prev, v) => (prev = exports.current, exports.current = null, v = fn(), exports.current = prev, v);

  exports.batch = batch;
  exports.computed = computed;
  exports.effect = effect;
  exports.signal = signal;
  exports.untracked = untracked;

}));
