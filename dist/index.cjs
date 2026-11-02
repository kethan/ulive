'use strict';

let current, batched;

// Notify the subscribers that existed when the write started: an effect may subscribe new
// effects while it runs, and those must hear about the next write, not this one.
const fire = (obs) => {
  if (obs) for (const fx of [...obs]) batched ? batched.add(fx) : fx();
};

// One shared shape per instance: only the value and the subscriber set are per-signal, every
// method lives on the prototype, so creating a signal allocates no closures.
class Signal {
  constructor(v) { this.v = v; }
  get value() {
    const c = current;
    if (c) (c.deps.push(this.o ||= new Set), this.o.add(c));
    return this.v;
  }
  set value(x) { Object.is(x, this.v) || (this.v = x, fire(this.o)); }
  peek() { return this.v }
  // coercion reads through the getter: `computed(() => num * 2)` must subscribe,
  // and then() keeps returning the value when called without a resolver
  then(res) { const v = this.value; return res ? res(v) : v }
  toJSON() { return this.value }
  valueOf() { return this.value }
  toString() { return String(this.value) }
}

// a computed is a signal plus a lazy producer effect keeping it current
class Computed extends Signal {
  constructor(fn) { super(); this.fn = fn; }
  get value() {
    if (this.r) throw Error('circular'); // re-entered while initializing: a cycle
    if (!this.e) {
      this.r = 1;
      try { this.e = effect(() => super.value = this.fn()); } finally { this.r = 0; }
    }
    return super.value;
  }
  // peek never subscribes, but still initializes
  peek() { return untracked(() => this.value) }
}

const signal = (v) => new Signal(v);

const computed = (fn) => new Computed(fn);

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

const batch = (fn, fxs = batched, i = 0) => {
  if (!fxs) batched = new Set;
  try {
    return fn();
  } finally {
    if (!fxs) {
      fxs = batched;
      try {
        // keep the queue live while flushing: an effect queued by an effect runs once
        for (const fx of fxs) {
          if (++i > 1e5) throw Error('depth');
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

exports.batch = batch;
exports.computed = computed;
exports.effect = effect;
exports.signal = signal;
exports.untracked = untracked;
