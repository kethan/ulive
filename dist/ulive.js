'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

exports.current = void 0;
  let signal = (v, s, obs = new Set) => (
    s = {
      get value() {
        exports.current?.deps.push(obs.add(exports.current));
        return v
      },
      set value(val) {
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
      }
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
