import { ReactiveFramework } from "../util/reactiveFramework";
import { signal, computed, effect, batch } from "/tmp/q/Lrepo/dist/index.es.js";

export const uliveLazyFramework: ReactiveFramework = {
  name: "ulive-lazy",
  signal: (initialValue) => {
    const s = signal(initialValue);
    return { write: (v) => (s.value = v), read: () => s.value };
  },
  computed: (fn) => {
    const c = computed(fn);
    return { read: () => c.value };
  },
  effect: (fn) => {
    effect(fn);
  },
  withBatch: (fn) => batch(fn),
  withBuild: (fn) => fn(),
};
