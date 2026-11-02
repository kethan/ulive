// How many times each node is recomputed by ONE write. A glitch-free engine recomputes every node
// exactly once; ulive's eager computeds push along every path, so shared nodes recompute repeatedly.
// `node glitch.mjs` measures the current build. To see the old eager core:
//   git show 5cef7c3:dist/index.es.js > /tmp/eager.es.js
//   node glitch.mjs /tmp/eager.es.js
const mods = {
  ulive: new URL('../../dist/index.es.js', import.meta.url).href,
  'ulive-lazy': new URL('./ulive-lazy.es.js', import.meta.url).href,
  preact: '@preact/signals-core',
};
if (process.argv[2]) mods['ulive (eager 5cef7c3)'] = process.argv[2];

for (const which of Object.keys(mods)) {
  const { signal, computed, effect } = await import(mods[which]);

  let nb = 0, nc = 0, nd = 0;
  const a = signal(0);
  const b = computed(() => (nb++, a.value + 1));
  const c = computed(() => (nc++, a.value + 2));
  const d = computed(() => (nd++, b.value + c.value));
  const log = [];
  effect(() => log.push(d.value));

  nb = nc = nd = 0;
  const initial = [...log];
  log.length = 0;
  a.value = 1;
  console.log(
    which.padEnd(11),
    `diamond: b×${nb} c×${nc} d×${nd} recomputes per write (ideal 1/1/1)`,
    `| effect saw ${JSON.stringify(log)} (ideal [5])`
  );

  // 4 wide, 3 layers, torus fan-in: 16 nodes, one write
  const src = signal(0);
  let count = 0;
  let layer = [];
  for (let w = 0; w < 4; w++) layer.push(computed(() => (count++, src.value)));
  for (let l = 0; l < 3; l++) {
    const next = [];
    for (let w = 0; w < 4; w++) {
      const p = layer[w], q = layer[(w + 1) % 4];
      next.push(computed(() => (count++, p.value + q.value)));
    }
    layer = next;
    for (const n of next) effect(() => n.value);
  }
  count = 0;
  src.value = 1;
  console.log(which.padEnd(11), `4x3 torus: ${count} recomputes for one write (ideal 16)`);
  void initial;
}
