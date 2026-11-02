# Benchmarks

Nothing here is published — the repo's `files` field only ships `dist/` and `fn/`. Everything is
run with `node`, some of it in jsdom, so no browser is required.

```sh
cd bench
npm install                     # @preact/signals-core, usignal, sprae, jsdom
npm run bench                   # signal-level microbenchmarks, ulive
npm run bench:krausest          # js-framework-benchmark-style ops in jsdom
npm run serve                   # static server for krausest/browser/index.html
```

| folder / file | what it measures |
|---|---|
| `reactivity/` | **the official [js-reactivity-benchmark](https://volynetstyle.github.io/js-reactivity-benchmark/)** — its own fixtures, workers, semantic checks and statistics, with an adapter for ulive. Read `reactivity/RESULTS.md` (or `RESULTS.txt`, or `report-*.png`) |
| `bench.mjs`, `lib.mjs` | signal-level microbenchmarks: create/read/write/fan-out/chain/diamond/batch/dispose, one process per library |
| `krausest/` | the js-framework-benchmark operation set (create/replace/update/select/swap/remove/append/clear) rendered into a real `<table>` through a tiny renderer, plus a vanilla-DOM baseline |
| `sizecmp/` | tree-shaken min+gz sizes for `{signal, computed, effect, batch, untracked}` across libraries |
| `tools/measure.sh` | rebuild `src/main.js` from a variant and print raw/gzip/brotli sizes |
| `RESULTS.md` | the tables from the microbenchmarks and the jsdom run |

## The headline result

The official harness (semantics v4) is the one that matters, so start there:

* **0 of 51 scenarios rejected** (the eager-computed core failed 3: `triangle`, `unstable`,
  `dynamic/large web app`).
* Median over the 49 scenarios every library completes: alien-signals 15.9 ms,
  Preact Signals 23.2 ms, **ulive 51.6 ms**, uSignal 49.8 ms.
* ulive beats Preact on all the large graphs (`large web app` 753 vs 4092 ms) and loses the
  sub-millisecond ones (`cellx2500` 21.7 vs 2.7 ms).

`reactivity/report-1-summary.png` is the whole thing on one page.

## Size

Minified (`dist/index.min.js`, `fn/index.min.js`), then gzip -9 / brotli:

| | raw | gzip | brotli |
|---|---:|---:|---:|
| ulive (object flavour) | 1175 | 612 | 575 |
| ulive/fn (callable flavour) | 1070 | 578 | 547 |

The pull-based core that fixed the harness failures was first written at 1355 raw / 617 brotli;
a measured size pass brought it back down (table in `reactivity/RESULTS.md`).

## Reproducing the official harness run

See `reactivity/README.md`: clone the harness, copy the two adapter files from
`reactivity/adapters/`, add two catalog/config entries, `npm run build`, then

```sh
BENCH_FRAMEWORK="ulive,Preact Signals,uSignal,alien-signals" \
BENCH_ALLOW_FAILURES=1 BENCH_SAMPLES_FILE=.../samples3.json \
node --expose-gc dist/index.js
```

`reactivity/samples3.json` is the full output of the run the report is built from (every sample,
with its statistics); `reactivity/samples2-rows.json` keeps only the per-row medians of the A/B run
that compares the old eager core with the pull-based one.
