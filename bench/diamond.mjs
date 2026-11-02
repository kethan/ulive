const m = await import(process.argv[2]);
const { signal, computed, effect } = m;
let sink = 0;
const times = [];
for (let r = 0; r < 5; r++) {
  const a = signal(0);
  const b = computed(() => a.value + 1);
  const c = computed(() => a.value + 2);
  const d = computed(() => b.value + c.value);
  effect(() => { sink += d.value });
  const t = performance.now();
  for (let i = 0; i < 1e4; i++) a.value = i;
  times.push(performance.now() - t);
}
times.sort((x, y) => x - y);
console.log(process.argv[3].padEnd(16), 'diamond 10k writes: min', times[0].toFixed(1), 'ms');
