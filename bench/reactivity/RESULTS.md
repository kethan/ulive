# ulive in the official js-reactivity-benchmark

The benchmark asked for: **https://volynetstyle.github.io/js-reactivity-benchmark/**
(`volynetstyle/js-reactivity-benchmark`, semantics v4). Nothing here re-implements its workloads —
these are its own fixtures, its own per-row worker isolation, its own semantic checks and its own
statistics. We only added an adapter (`adapters/`, 3-step setup in `README.md`).

Machine: Intel Xeon @ 2.60 GHz, 2 cores, Node v22.22.3, linux/x64, `--expose-gc`,
`BENCH_PROFILE=quick` (warmup 2, ≥10 samples or 250 ms per row, max 100), one forked process per
row, interleaved scenario-major order. 51 scenarios.

## Headline

1. **The old core was wrong, and the harness proved it.** With `5cef7c3` (eager computeds) ulive was
   rejected on 3 of 51 scenarios: `triangle` (909 deliveries of a value that was never correct for
   that step — a glitch), `unstable` (99) and `large web app` (one extra effect run). **ulive now
   passes 51 of 51.**
2. **The fix made it faster, not slower.** Mark-stale-on-write / recompute-on-read: over the 46
   scenarios both builds complete, the median drops 80.5 → 51.9 ms and it wins 38 of them
   (`simple component` 1650 → 746 ms, `large web app` FAIL → 753 ms, `dashboard` 1704 → 879 ms,
   `editor derived state` 2760 → 1436 ms).
3. **Where it lands.** Median of the 49 scenarios every build completes: alien-signals **15.9 ms**,
   Preact Signals **23.2 ms**, **ulive 51.6 ms**, uSignal **49.8 ms**. ulive is a median **2.30×**
   behind Preact, and ahead of it on 7 scenarios — the large ones: `large web app` 753 vs 4092 ms,
   `wide dense` 2175 vs 4936, `stable diamond mesh` 26 vs 265, `dashboard` 879 vs 1183.
   It is behind on tiny graphs (`cellx2500` 21.7 vs 2.7 ms, `avoidablePropagation` 1.5 vs 0.23).
4. The remaining gap to Preact is **not** algorithmic any more; it is per-node constant cost
   (a `Set` per node for subscribers and dependencies, a `Set` queue per write).

## The table

Medians in ms, lower is better. `ulive` = this branch (`8b97cfe`, pull-based core).
`ulive / Preact` < 1 means ulive is faster.

| scenario | ulive | Preact | uSignal | alien | ulive / Preact |
|---|---:|---:|---:|---:|---:|
| avoidablePropagation | 1.48 | 0.229 | 1.17 | 0.176 | 6.45× |
| broadPropagation | 1.39 | 0.407 | 1.02 | 0.351 | 3.40× |
| deepPropagation | 0.468 | 0.153 | 0.423 | 0.092 | 3.06× |
| diamond | 0.829 | 0.271 | 0.642 | 0.185 | 3.05× |
| mux | 1.48 | 0.432 | 1.47 | 0.359 | 3.43× |
| repeatedObservers | 0.126 | 0.035 | 0.100 | 0.064 | 3.56× |
| triangle | 0.303 | 0.089 | 0.227 | 0.073 | 3.42× |
| unstable | 0.183 | 0.083 | 0.125 | 0.085 | 2.19× |
| manyEffectsFromOneSource | 994 | 249 | 774 | 237 | 4.00× |
| manySourcesIntoOneComputedEffectWithDirect | 373 | 184 | 319 | 127 | 2.03× |
| manySourcesIntoOneComputedEffect | 371 | 173 | 297 | 118 | 2.14× |
| manySourcesIntoOneDirectEffect | 23.96 | 29.60 | 23.19 | 11.89 | 0.81× |
| molBench | 0.114 | 0.070 | 0.109 | 0.067 | 1.63× |
| mutable-object/immutable replacement | 3.09 | 1.23 | 2.25 | 0.753 | 2.52× |
| mutable-object/in-place versioned | 3.54 | 1.11 | 2.35 | 0.787 | 3.20× |
| createDataSignals | 8.38 | 10.03 | 14.08 | 5.39 | 0.84× |
| createComputations0to1 | 78.52 | 19.72 | 109 | 24.96 | 3.98× |
| createComputations1to1 | 69.23 | 28.32 | 49.77 | 13.13 | 2.44× |
| createComputations2to1 | 51.26 | 25.11 | 29.04 | 9.29 | 2.04× |
| createComputations4to1 | 46.02 | 22.79 | 18.98 | 6.89 | 2.02× |
| createComputations1000to1 | 29.98 | 12.42 | 14.88 | 5.07 | 2.41× |
| createComputations1to2 | 51.21 | 30.73 | 49.71 | 42.38 | 1.67× |
| createComputations1to4 | 45.07 | 26.26 | 99.48 | 46.64 | 1.72× |
| createComputations1to8 | 54.06 | 30.33 | 128 | 45.61 | 1.78× |
| createComputations1to1000 | 83.71 | 78.51 | 120 | 44.65 | 1.07× |
| updateComputations1to1 | 85.21 | 16.99 | 66.55 | 21.09 | 5.02× |
| updateComputations2to1 | 56.79 | 21.61 | 42.56 | 18.93 | 2.63× |
| updateComputations4to1 | 33.48 | 14.01 | 25.93 | 15.87 | 2.39× |
| updateComputations1000to1 | 69.76 | 23.20 | 44.36 | 13.80 | 3.01× |
| updateComputations1to2 | 64.16 | 21.19 | 56.73 | 15.48 | 3.03× |
| updateComputations1to4 | 51.59 | 19.79 | 56.39 | 15.12 | 2.61× |
| updateComputations1to1000 | 49.71 | 17.24 | 58.52 | 19.79 | 2.88× |
| dynamic/dashboard selective reads | 879 | 1183 | 858 | 311 | 0.74× |
| dynamic/editor derived state | 1436 | 1061 | 1255 | 566 | 1.35× |
| dynamic/kanban board | 1524 | 1141 | 945 | 361 | 1.34× |
| dynamic/entity detail page | 1405 | 924 | 1292 | 593 | 1.52× |
| dynamic/layered full-drain cold | 305 | 273 | 301 | 135 | 1.12× |
| dynamic/layered full-drain warm | 283 | 287 | 194 | 157 | 0.99× |
| dynamic/layered burst flush warm | 2886 | 1547 | 2672 | 958 | 1.87× |
| dynamic/stable diamond mesh warm | 26.12 | 265 | 14.58 | 10.01 | 0.10× |
| dynamic/pure pull | 3.17 | 1.38 | 1.38 | 0.861 | 2.30× |
| dynamic/pure push | 432 | 270 | 390 | 137 | 1.60× |
| dynamic/simple component | 746 | 508 | 586 | 227 | 1.47× |
| dynamic/dynamic component | 691 | 276 | 559 | 205 | 2.50× |
| dynamic/large web app | 753 | 4092 | 729 | 351 | 0.18× |
| dynamic/wide dense | 2175 | 4936 | 1783 | 522 | 0.44× |
| dynamic/deep | 485 | 211 | 409 | 169 | 2.30× |
| lifecycle/owned graph create-update-dispose | — | — | — | 17.61 | — |
| lifecycle/dispose retained graph | — | — | — | 0.064 | — |
| cellx1000 | 5.99 | 1.03 | 2.24 | 1.16 | 5.79× |
| cellx2500 | 21.74 | 2.73 | 5.57 | 3.42 | 7.96× |


## Why the old core failed: eager computeds

ulive's `computed` kept an internal effect, so a write pushed the new value through *every* path of
the graph. A node with two dirty inputs recomputed once per path, and its subscribers ran once per
path too — the first run seeing a half-updated graph. `glitch.mjs`:

```
$ node glitch.mjs
ulive (eager)  diamond: b×1 c×1 d×2 recomputes per write (ideal 1/1/1) | effect saw [4,5] (ideal [5])
ulive (eager)  4x3 torus: 60 recomputes for one write (ideal 16)
ulive (pull)   diamond: b×1 c×1 d×1 recomputes per write (ideal 1/1/1) | effect saw [5] (ideal [5])
ulive (pull)   4x3 torus: 16 recomputes for one write (ideal 16)
preact         diamond: b×1 c×1 d×1 recomputes per write (ideal 1/1/1) | effect saw [5] (ideal [5])
preact         4x3 torus: 16 recomputes for one write (ideal 16)
```

The old test suite had this baked in as expected behaviour — `computed: diamond dependencies`
asserted `log == [4, 5, 7]` with the comment *"a diamond read inside an effect can be observed
twice"*. That is the same defect the harness counts as `delivery mismatches`, and it is pure
wasted work in the push-heavy fixtures. `batch` cannot fix it: it collapses a burst of writes into
one flush, but fan-in *inside* one flush is still pushed path by path.

## A/B, same run, same machine (run 2)

Both ulive builds measured in one interleaved pass, so the comparison is apples to apples:

| scenario | eager (`5cef7c3`) | pull-based | Preact |
|---|---:|---:|---:|
| avoidablePropagation | 0.637 | 1.5 | 0.252 |
| broadPropagation | 1.6 | 1.4 | 0.397 |
| deepPropagation | 0.696 | 0.453 | 0.198 |
| diamond | 1.1 | 0.806 | 0.265 |
| mux | 0.715 | 1.4 | 0.407 |
| repeatedObservers | 0.135 | 0.131 | 0.037 |
| triangle | FAIL | 0.329 | 0.107 |
| unstable | FAIL | 0.176 | 0.084 |
| manyEffectsFromOneSource | 816 | 1000 | 275 |
| manySourcesIntoOneComputedEffectWithDirect | 418 | 393 | 154 |
| manySourcesIntoOneComputedEffect | 623 | 375 | 195 |
| manySourcesIntoOneDirectEffect | 17.7 | 22.8 | 29.7 |
| molBench | 0.075 | 0.108 | 0.066 |
| mutable-object/immutable replacement | 2.7 | 2.6 | 1.1 |
| mutable-object/in-place versioned | 3.1 | 2.7 | 1.1 |
| createDataSignals | 9.0 | 8.8 | 10.6 |
| createComputations0to1 | 141 | 79.1 | 20.6 |
| createComputations1to1 | 130 | 89.6 | 31.0 |
| createComputations2to1 | 91.6 | 48.2 | 26.5 |
| createComputations4to1 | 64.7 | 47.3 | 24.9 |
| createComputations1000to1 | 38.0 | 36.5 | 15.2 |
| createComputations1to2 | 154 | 64.4 | 29.7 |
| createComputations1to4 | 193 | 55.0 | 37.1 |
| createComputations1to8 | 170 | 55.8 | 26.1 |
| createComputations1to1000 | 144 | 74.7 | 67.8 |
| updateComputations1to1 | 78.9 | 50.5 | 21.8 |
| updateComputations2to1 | 57.4 | 36.3 | 16.8 |
| updateComputations4to1 | 41.8 | 30.0 | 14.4 |
| updateComputations1000to1 | 45.8 | 73.8 | 19.3 |
| updateComputations1to2 | 82.1 | 49.5 | 13.9 |
| updateComputations1to4 | 75.0 | 44.9 | 17.9 |
| updateComputations1to1000 | 77.6 | 53.3 | 16.0 |
| dynamic/dashboard selective reads | 1704 | 898 | 1099 |
| dynamic/editor derived state | 2760 | 1446 | 1024 |
| dynamic/kanban board | 1544 | 1066 | 943 |
| dynamic/entity detail page | 2624 | 1587 | 892 |
| dynamic/layered full-drain cold | 491 | 295 | 268 |
| dynamic/layered full-drain warm | 449 | 323 | 636 |
| dynamic/layered burst flush warm | 4149 | 2879 | 1356 |
| dynamic/stable diamond mesh warm | 31.7 | 17.4 | 186 |
| dynamic/pure pull | 1.6 | 0.775 | 1.1 |
| dynamic/pure push | 646 | 405 | 211 |
| dynamic/simple component | 1650 | 677 | 522 |
| dynamic/dynamic component | 1286 | 803 | 354 |
| dynamic/large web app | FAIL | 966 | 5257 |
| dynamic/wide dense | 2529 | 2209 | 7328 |
| dynamic/deep | 978 | 561 | 217 |
| cellx1000 | 2.4 | 6.5 | 1.0 |
| cellx2500 | 12.0 | 29.9 | 2.8 |

## What it costs

| | eager `5cef7c3` | pull-based `8b97cfe` |
|---|---:|---:|
| `dist` min+gz (ulive flavour) | 1084 raw / 544 gzip / **490 brotli** | 1355 / 663 / **617** → after the size pass **1175 / 612 / 575** |
| `fn` flavour | 833 / 484 / **460** brotli | 1156 / 615 / **575** → after the size pass **1070 / 578 / 547** |
| own test suite | 181 / 176 pass / 5 skip | 181 / 176 pass / 5 skip |
| scenarios rejected by the harness | 3 of 51 | **0 of 51** |

Two assertions changed meaning, both deliberate and both in the direction of what the harness
checks: the diamond now delivers `[4, 7]` instead of `[4, 5, 7]`, and a throwing computed surfaces
its error when the value is **read**, not when the source is written (with lazy evaluation there is
nothing to throw during the write — Preact, Solid and alien-signals behave the same way).

Trade-off on tiny graphs, measured with `../bench.mjs` (the signal-level scenarios in
`../RESULTS.md`): `1 signal 1 effect 100k writes` 12 → ~30 ms and `100 effects 10k writes`
69 → ~180 ms, because each write now also walks a dirty-flag `Set` queue, while
`diamond 10k writes` 20 → ~10 ms and `computed chain 100 deep` 31 → ~22 ms improve.

## jsdom sanity check (the other harness in `../krausest/`)

The DOM-heavy operations do not care much either way — the previous build and this one are within
noise of each other, and both stay near plain DOM: `create 1k rows` 41.4 → 44–66 ms (vanilla 32–37),
`update every 10th row` 0.76 → 0.72–0.84 (vanilla 0.64), `create 10k rows` 492 → 432–646,
`clear 1k rows` 3.1 → 2.9–5.8. Where this change costs, it costs on *tiny* graphs, and a DOM row is
a tiny graph.

## The size pass, after the numbers above were taken

The pull-based core cost +266 B raw over the eager one, so it got its own measured pass
(`9f31fe4`). Every step was kept only if the two test suites, the signal-level benchmarks and this
harness all stayed green:

| step | raw | gzip | brotli |
|---|---:|---:|---:|
| pull-based core as first written | 1355 | 663 | 617 |
| one class (a computed is a signal with a producer) | 1185 | 621 | 580 |
| one `exec` for producers and effects | 1230 | 640 | 597 |
| `effect()` stops allocating a Set that `exec` replaced | 1218 | 635 | 592 |
| `peek()` reads through the getter (no per-class override) | 1218 | 635 | 592 |
| queue item as a parameter, disposer as one expression | 1182 | 620 | 578 |
| terser `passes: 3` | **1175** | **612** | **575** |

Final: **1175 raw / 612 gzip / 575 brotli** (from 1355 / 663 / 617), `fn` flavour
**1070 / 578 / 547** (from 1156 / 615 / 575) — a **13.3% / 7.7% / 6.8%** cut for the object
flavour. Speed is unchanged: five rounds of `../bench.mjs` put every scenario within noise of the
previous build (0.88–1.17×), and this harness re-ran with 0 failures.

Two tempting changes were measured and **rejected**:

* `delete fx.f` on dispose instead of `fx.f = 0` saved 9 B but forces V8 into dictionary mode:
  `create+dispose 100k effects` went 30 → 65 ms (2.1×).
* dropping the dependency pruning in favour of "unsubscribe everything, let tracking re-subscribe"
  saved 34 B raw / 22 B brotli but cost 17–49% on `1 effect × 100k writes`, `100 effects × 10k`,
  the computed chain and the diamond.

## Caveats

* `quick` profile, 1 round, ≤100 samples: sub-millisecond rows had coefficients of variation up to
  100% (`pure pull` is the worst offender — 0.8 / 1.6 / 3.2 ms across three runs of the same
  build). Read anything under ~1.5× as a tie; the multi-hundred-ms rows are stable.
* `lifecycle/*` needs a native owner scope (`createScope`): ulive has no graph-level disposal, so
  those two rows are `—` for ulive, Preact and uSignal; only alien-signals reports them.
* The first attempt at this benchmark used `withBatch: fn => fn()`. That is wrong — ulive does have
  `batch` — and it produced `SIGKILL` (out-of-memory) rows for `pure push` and `large web app`.
  With the real `batch()` those rows pass even on the old core. The crashes were an adapter
  artefact; the 3 semantic failures were not.

## Files

| file | what |
|---|---|
| `samples3.json`, `run3.log` | **the table above** — shipped pull-based ulive vs the harness's own adapters |
| `samples2-rows.json` | the A/B run: eager `5cef7c3` vs the pull-based build, plus Preact/uSignal/alien (medians only) |
| `adapters/` | the ulive adapter(s); `README.md` explains the 3-step setup and the env knobs |
| `table.mjs` | `node table.mjs [samples3.json]` prints the markdown table (`--write` saves it) |
| `glitch.mjs` | the 20-line proof that an eager computed recomputes once per path |
| `ulive-pull-core.js` | the pull-based core as benchmarked, merged into ulive's `src/main.js` in `8b97cfe` (README in `f655a10`) |
| `samples4-verify.json`, `run4.log` | re-run after the size pass (`9f31fe4`): ulive vs Preact, **0 failures**, same timings |
