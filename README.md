# ULive [![test](https://github.com/kethan/ulive/actions/workflows/test.yml/badge.svg)](https://github.com/kethan/ulive/actions/workflows/test.yml)

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive) [![Badge size](https://deno.bundlejs.com/badge?q=ulive&treeshake=[*]&config={"compression":"brotli"})](https://unpkg.com/ulive) [![Badge size](https://deno.bundlejs.com/badge?q=ulive&treeshake=[*]&config={"compression":"gzip"})](https://unpkg.com/ulive)

**yarn**: `yarn add ulive`

**npm**: `npm i ulive`

**cdn**: https://esm.sh/ulive

**module**: https://esm.sh/ulive?module

-   **Small.**
-   **Fast.**
-   **Simple API**
-   **Reactive.**
-   **Circular Detection**

## Entries

Three entry points, one package:

| entry | what | min | gzip | brotli |
| --- | --- | ---: | ---: | ---: |
| `ulive` | the current core: glitch-free delivery, guarded cycles and loops, per-run dependency pruning | 1175 B | 612 B | **575 B** |
| `ulive/fn` | the same core with the callable API (`o`, `memo`) | 1070 B | 578 B | **547 B** |
| `ulive/tiny` | the original 1.x core, unchanged - **~30% smaller, but bug-compatible** | 629 B | 382 B | **349 B** |

Sizes are the shipped minified builds (`dist/index.min.js`, `fn/index.min.js`,
`tiny/index.min.js`), then `gzip -9` and `brotli`.

`ulive/tiny` is not a subset of `ulive` - it is the older implementation, kept for bundle size. It
has the same five exports (`signal`, `computed`, `effect`, `batch`, `untracked`) and it is the
right choice only if every byte counts and you can live with the differences below. Both are tested:
`npm test` runs the `ulive` suite, the `ulive/fn` suite and the `ulive/tiny` suite.

```js
import { signal, computed, effect } from "ulive/tiny";   // 349 B brotli
import { signal, computed, effect } from "ulive";        // 575 B brotli
```

### What `ulive/tiny` does differently

| | `ulive` | `ulive/tiny` |
| --- | --- | --- |
| a diamond (`a -> b, c -> d`) | `d` recomputes once per write, the effect runs once with the settled value | the effect runs **twice**, the first time with a half-updated value |
| `computed.peek()` before the first read | initializes and returns the value | returns `undefined` |
| a self-referencing `computed` | `Error('circular')` | `RangeError: Maximum call stack size exceeded` |
| a producer that throws | `computed` is computed on read, error surfaces at the reader | runs eagerly, the error surfaces at the writer |
| a runaway effect loop (effect writes its own dependency) | `Error('depth')` in ~90 ms | the heap grows until **out of memory** |
| re-setting `NaN` | not a change (`Object.is`) | a change every time (`===`) |
| disposer called twice | no-op the second time | runs the teardown **again** |
| `untracked(fn)` when `fn` throws | tracking is restored (`finally`) | stays off for the rest of the effect |
| `batch(fn)` | returns `fn()`'s value | returns `undefined`; an effect queued while flushing can run twice |
| `await signal(x)` | resolves with the value | **never resolves** (`then` ignores the resolver) |
| an effect that subscribes new effects to the same signal | bounded (the notification walks a snapshot) | grows geometrically until out of memory |

Performance, same machine, same scenario code (`bench/bench.mjs`): `ulive/tiny` pays for what it
skips. It is **2-3x faster** when work is a single signal and one effect (`1 signal, 1 effect, 100k
writes` 12.3 vs 29.1 ms, `100 effects, 10k writes` 52.4 vs 194 ms) and on creation it is **35x
slower** (`create 100k signals` 134.6 vs 3.8 ms, because every `signal()` allocates its own
closures). On the official [js-reactivity-benchmark](bench/reactivity/RESULTS.md) the old core is
behind the current one and is rejected on 3 of its 51 scenarios.

If you depend on any row of that table, use `ulive`. `ulive/tiny` exists so that an existing 1.x
user can pin the old bytes deliberately, not so that a new project starts there.

## API

## Fn version

This is function based signal.

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive) [![Badge size](https://deno.bundlejs.com/badge?q=ulive/fn&treeshake=[*]&config={"compression":"brotli"})](https://unpkg.com/ulive/fn) [![Badge size](https://deno.bundlejs.com/badge?q=ulive/fn&treeshake=[*]&config={"compression":"gzip"})](https://unpkg.com/ulive/fn)


**yarn**: `yarn add ulive`

**npm**: `npm i ulive`

**cdn**: https://esm.sh/ulive/fn

**module**: https://esm.sh/ulive/fn?module

```js
import { o, effect, memo, batch, untracked } from "ulive/fn";

const num = o(0);
num(10);
console.log(num());
```


### signal(val)

Create a reactive or live state.

```js
import { signal, computed, effect } from "ulive";

const num = signal(0);
num.value = 10;
console.log(num.value);
```

### effect(fn)

Run fn with automatic dependency check & cleanup return.

```js
let num = signal(0);
effect(() => console.log(num.value));
```

### computed(fn)

Returns computed value.

```js
let num = signal(0);
let square = computed(() => num.value * num.value);
let cube = computed(() => square.value * num.value);
effect(() => console.log(num.value, square.value, cube.value));
```

### batch(fn)

Defer effects.

```js
let a = signal(0), b = signal(1)
let mul = computed(() => a.value * b.value);
effect(() => console.log(a.value, b.value, mul.value));
batch(() => (a++, b++));
```

### untracked(fn)

Run without effects.

```js
let a = signal(0), b = signal(1)
let mul = computed(() => a.value * b.value);
effect(() => untracked(() => console.log(a.value)));
```

### batch(fn)

Defer effects. Returns whatever `fn` returns; effects queued while flushing are
still deduped, so an effect never runs twice for one batch. If `fn` throws, the
pending effects are flushed and the error is re-thrown.

```js
const a = signal(0), b = signal(1);
const mul = computed(() => a.value * b.value);
effect(() => console.log(mul.value)); // 0
batch(() => { a.value = 2; b.value = 3 }); // one log: 6
```

### untracked(fn)

Run without effects. Returns the value of `fn`. Tracking is restored even when
`fn` throws.

```js
const a = signal(0), b = signal(1);
effect(() => untracked(() => console.log(a.value, b.value))); // never re-runs
```

### effect dispose

`effect` returns a disposer. Calling it more than once is a no-op, and an effect
disposed inside an open `batch` does not run when that batch flushes.

```js
const off = effect(() => console.log(num.value));
off();
```

### Notes

-   `peek()` never subscribes, and it initializes a `computed`/`memo` on first use.
-   Reading a `computed`/`memo` from itself (directly or through a cycle) throws an
    `Error('circular')` instead of overflowing the stack.
-   A write only notifies the effects that were already subscribed when it started.
    An effect that subscribes another effect to the same signal (a nested component
    tree, a list that renders lists) therefore does not fan out inside one write.
-   Effects created inside an effect are not disposed automatically - return the
    inner disposer as the teardown, otherwise every parent run adds a new one.
-   A write marks the nodes that read it dirty; `computed`/`memo` recompute when they
    are read. A diamond (`a -> b, c -> d`) therefore recomputes `d` once per write and
    its effect runs once, with the settled value - no intermediate state is delivered.
-   Because of that, an error thrown inside a `computed`/`memo` surfaces when its value
    is read, not when the signal it reads is written.
-   Dependencies are re-collected on every run, so an effect that stops reading a signal
    behind a false condition also stops listening to it.

### toJSON or then or valueOf

```js
const counter = signal(0);
const effectCount = signal(0);

effect(() => {
	console.log(counter.value);
	// Whenever this effect is triggered, increase `effectCount`.
	// But we don't want this signal to react to `effectCount`
	effectCount.value = effectCount.valueOf() + 1;
});
```

## Usage

```js
const num = signal(1);
let square = computed(() => num.value * num.value);
let cube = computed(() => square.value * num.value);
effect(() => console.log(num.value, square.value, cube.value));
num.value = 1;
num.value = 2;
num.value = 3;
```

## Thanks and Inspiration

-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**
-   **[WebReflection](https://github.com/WebReflection/usignal)**
-   **[Preact](https://github.com/preactjs/signals)**

## License

MIT
