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
