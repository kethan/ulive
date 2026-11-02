const w = process.argv[2];
const m = await import(w);
const mk = m.signal;
const times = [];
for (let r = 0; r < 5; r++) {
  const t = performance.now();
  const a = [];
  for (let i = 0; i < 1e5; i++) a.push(mk(i));
  times.push(performance.now() - t);
  if (a.length !== 1e5) throw 1;
}
times.sort((x, y) => x - y);
console.log(process.argv[3].padEnd(20), 'create 100k: min', times[0].toFixed(1), 'ms  ->', (times[0] * 10).toFixed(0), 'ns/signal');
