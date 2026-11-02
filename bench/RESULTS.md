# Benchmark results

> **These numbers describe `5cef7c3` (eager computeds).** Since then the core became pull-based
> (`8b97cfe`), because the official
> [js-reactivity-benchmark](../reactivity/RESULTS.md) rejected 3 of its 51 scenarios: an eager
> computed recomputed a join once per path and delivered a half-updated value. The official
> benchmark is now green (51/51). Here is what the change costs on the scenarios below, measured on
> the same machine with the same scripts:
>
> | scenario (ms) | `5cef7c3` eager | `8b97cfe` pull |
> |---|---:|---:|
> | create 100k signals | 4.3 | **3.8** |
> | 1 signal read 1M times | 4.9 | 5.3 |
> | 1 signal, 1 effect, 100k writes | **11.8** | 30.8 |
> | 1 signal, 100 effects, 10k writes | **64.7** | 201.8 |
> | computed chain 100 deep, 1k writes | 32.6 | **20.2** |
> | diamond, 10k writes | 12.9 | **8.5** |
> | 1k batches x 10 writes | 2.9 | **2.5** |
> | create+dispose 100k effects | 29.8 | **28.4** |
> | jsdom create 1k rows | 41.4 | ~55 (43.9–66 across 3 processes) |
> | jsdom update every 10th row | 0.76 | 0.72–0.84 |
> | jsdom create 10k rows | 492 | 432–646 |
> | jsdom clear 1k rows | 3.12 | 2.9–5.8 |
>
> Faults on tiny graphs are per-node `Set` bookkeeping; the official harness prefers the new
> trade-off on 38 of 46 scenarios.

`ulive` 5cef7c3 (class/prototype design) vs `ulive-old` 5323871 (closure design) vs the libraries.

## js-framework-benchmark operations (jsdom, median of 2 processes x 9 runs, ms)

scenario                         vanilla      ulive  ulive-old     preact    usignal      sprae        best
create 1k rows                     32.4*       41.4       45.9       40.7       43.3       41.1     vanilla
replace all 1k rows                33.0*       41.2       40.7       35.1       41.3       42.1     vanilla
update every 10th row (1k)          0.69       0.76       0.72      0.66*       0.71       0.69      preact
select row (1k)                    0.17*       0.20       0.19       0.18       0.18       0.24     vanilla
swap 2 rows (1k)                    0.10       0.10       0.09       0.09      0.09*       0.10     usignal
remove row (1k)                    0.07*       0.08       0.08       0.07       0.09       0.09     vanilla
create 10k rows                     401*        492        445        453        472        458     vanilla
append 1k to 1k                    29.4*       32.7       33.4       31.5       34.3       34.2     vanilla
clear 1k rows                       2.88       3.12       6.84      2.65*       2.98       5.10      preact

retained heap, 10k live rows (MB)
                                    68.2         75       82.3       72.5       76.7       71.7

x plain DOM (vanilla = 1.00, lower is better)
scenario                           ulive  ulive-old     preact    usignal      sprae
create 1k rows                     1.28x      1.42x      1.25x      1.34x      1.27x
replace all 1k rows                1.25x      1.23x      1.06x      1.25x      1.28x
update every 10th row (1k)         1.11x      1.05x      0.95x      1.03x      1.00x
select row (1k)                    1.16x      1.12x      1.02x      1.06x      1.38x
swap 2 rows (1k)                   0.98x      0.91x      0.92x      0.89x      0.96x
remove row (1k)                    1.16x      1.16x      1.03x      1.32x      1.29x
create 10k rows                    1.23x      1.11x      1.13x      1.18x      1.14x
append 1k to 1k                    1.11x      1.14x      1.07x      1.17x      1.16x
clear 1k rows                      1.08x      2.38x      0.92x      1.04x      1.77x

noise: inter-quartile spread as % of the median, worst scenario per lib
  vanilla    117%  (remove row (1k))
  ulive      107%  (clear 1k rows)
  ulive-old  59%  (select row (1k))
  preact     127%  (clear 1k rows)
  usignal    63%  (swap 2 rows (1k))
  sprae      97%  (remove row (1k))

correctness: all 9 operations verified on every library

## Signal-level microbenchmarks (node 22, min of 3, ms)

| scenario | ulive | ulive-old | preact | usignal | sprae |
| --- | ---: | ---: | ---: | ---: | ---: |
| create 100k signals | **4.3** | 151.2 | 6.1 | 28.7 | 6.8 |
| 100k signals + effect + write | 129.9 | 341.4 | 128.4 | 282.3 | **126.2** |
| 1 signal read 1M times | 4.9 | 11.9 | **4.9** | 5.5 | 6.0 |
| 1 signal 1 effect 100k writes | 11.8 | 18.7 | **8.7** | 29.7 | 10.2 |
| 1 signal 100 effects 10k writes | 64.7 | 76.2 | 57.6 | 160.6 | **44.0** |
| computed chain 100 deep 1k writes | 32.6 | 33.5 | 16.0 | 26.6 | **0.2** |
| diamond 2 levels 10k writes | 12.9 | 17.4 | **3.9** | 19.7 | 8.3 |
| 1k batches x 10 writes | 2.9 | 2.9 | 2.6 | 2.8 | **1.0** |
| create+dispose 100k effects | 29.8 | 29.5 | 21.0 | 138.4 | **17.0** |

Bundled size for `{signal, computed, effect, batch, untracked}` (rollup+terser, tree-shaken):

| | raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| **ulive** | **1069** | **540** | **496** |
| sprae/signal | 1308 | 668 | 619 |
| usignal/sync | 1968 | 874 | 808 |
| preact/signals-core | 4694 | 1706 | 1561 |
