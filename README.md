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

Four entry points, two flavours:

| flavour | current core | original 1.x core |
| --- | --- | --- |
| object (`signal`, `computed`) | `ulive` - 1169 / 610 / **578 B** | `ulive/tiny` - 627 / 381 / **350 B** |
| callable (`o`, `memo`) | `ulive/fn` - 1066 / 579 / **544 B** | `ulive/tiny/fn` - 622 / 387 / **350 B** |

Each cell is minified / `gzip -9` / **`brotli`**, from the shipped builds (`dist/index.min.js`,
`fn/index.min.js`, `tiny/index.min.js`, `tiny/fn/index.min.js`).

```js
import { signal, computed, effect } from "ulive";        // 578 B brotli - default
import { o, memo, effect } from "ulive/fn";              // 544 B brotli
import { signal, computed, effect } from "ulive/tiny";   // 350 B brotli - 1.x behaviour
import { o, memo, effect } from "ulive/tiny/fn";         // 350 B brotli - 1.x behaviour
```

The `tiny` pair is not a subset of the current core - it is the 1.x implementation, kept for bundle
size, with the same exports and the same API shape. Pick it only if every byte counts and you can
live with the differences below; pick the current core otherwise. All four are tested, and `npm
test` runs every suite:

```
ulive         181 assertions / 176 pass / 5 skip
ulive/fn      181 assertions / 176 pass / 5 skip
ulive/tiny     51 assertions /  51 pass
ulive/tiny/fn  46 assertions /  46 pass
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

The callable flavour has the same differences, plus two that only exist there:

| | `ulive/fn` | `ulive/tiny/fn` |
| --- | --- | --- |
| `o(9)` returns | the written value | `undefined` |
| `memo.peek()` before the first read | initializes and returns the value | returns `undefined` |
| writing to a `memo` | ignored by both | ignored by both |

Performance, same machine, same scenario code (`bench/bench.mjs`, object flavour): `ulive/tiny`
pays for what it
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
