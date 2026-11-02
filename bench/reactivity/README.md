# ulive in the official js-reactivity-benchmark

Everything here reproduces the numbers in `RESULTS.md`.

The benchmark is **https://github.com/volynetstyle/js-reactivity-benchmark** (the
`js-reactivity-benchmark` / milomg lineage, semantics v4) — the harness behind
https://volynetstyle.github.io/js-reactivity-benchmark/. Nothing in this folder re-implements
its workloads: we add adapters and run its own runner.

## Setup

```sh
git clone https://github.com/volynetstyle/js-reactivity-benchmark /tmp/rb2
cd /tmp/rb2
npm i --legacy-peer-deps --ignore-scripts
npm i @rescript/runtime rxjs @volynets/reflex-runtime      # workers of adapters we do not run still resolve peers
```

Add the adapters:

```sh
cp <this dir>/adapters/ulive.ts       src/frameworks/ulive.ts
cp <this dir>/adapters/uliveLazy.ts   src/frameworks/uliveLazy.ts   # optional: pull-based prototype
```

Register them (two edits, both mechanical):

* `src/frameworkCatalog.json` — one object per adapter:
  `{ "id": "ulive", "name": "ulive", "module": "ulive", "export": "uliveFramework", "pullCounts": true }`
  (`"id": "ulive-lazy"` / `"uliveLazy"` / `"uliveLazyFramework"` for the second one).
* `src/config.ts` — import it and add `{ framework: uliveFramework, testPullCounts: true }` to
  `frameworkInfo`.

Then build and run:

```sh
npm run build
BENCH_FRAMEWORK="ulive,ulive-lazy,Preact Signals,uSignal,alien-signals" \
BENCH_ALLOW_FAILURES=1 BENCH_SAMPLES_FILE=.../samples3.json \
node --expose-gc dist/index.js
```

Useful knobs: `BENCH_PROFILE=quick|tails`, `BENCH_FILTER="pure pull,simple component"`,
`BENCH_SHARD=1/4`, `BENCH_SAMPLES=30`, `BENCH_ROW_TIMEOUT_MS`, `BENCH_HEAP_MB`.
Each row runs in its own forked worker, so a library that hangs or dies only loses its row.

## Adapter notes (important)

The adapter interface is `signal(init) → {read, write}`, `computed(fn) → {read}`, `effect(fn)`,
`withBatch(fn)`, `withBuild(fn)`.

`withBatch` **must** call ulive's real `batch()`:

```js
withBatch: (fn) => batch(fn),
```

Mapping it to `fn => fn()` (the obvious thing if you think of ulive as "synchronous") makes every
write flush its own cascade; on the burst/push workloads that changes the measured work
completely, and in a first pass it produced `SIGKILL` (out of memory) rows for `pure push` and
`large web app`. With the real `batch()` those rows pass. `withBuild` stays `fn => fn()`, which is
what the Preact Signals and uSignal adapters do too.

## Files

| file | what |
|---|---|
| `RESULTS.md` | the report: full table, harness rejections, root cause |
| `samples3.json` | raw output of the final run (`bench-results/last-run.samples.json` format): per-row medians, intervals, every sample |
| `samples2-rows.json` | the A/B run (eager core vs the pull-based build), medians only — the full file with every sample is ~600 KB |
| `run3.log` | raw stdout of the final run (includes the `# semantics=` machine line) |
| `table.mjs` | `node table.mjs [samples3.json]` → regenerates the markdown table |
| `adapters/` | the two adapter files |
| `RESULTS.html` | the same report as one self-contained page (inline CSS, no scripts) |
| `report-1-summary.png`, `report-2-table.png` | the report as images — `python3 make-png.py` regenerates them from the sample files |
| `make-html.mjs` | `node make-html.mjs` rebuilds `RESULTS.html` |

`lifecycle/*` rows only run for engines that expose a native owner scope (`createScope`); ulive does
not, so those two rows are `—` for ulive, Preact and uSignal and only alien-signals reports them.
