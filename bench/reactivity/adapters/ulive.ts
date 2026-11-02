import { ReactiveFramework } from "../util/reactiveFramework";
import { signal, computed, effect, batch } from "/home/user/ulive/dist/index.es.js";

export const uliveFramework: ReactiveFramework = {
  name: "ulive",
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
