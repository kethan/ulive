# ULive

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive) [![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=brotli&label=brotli&style=flat-square)](https://unpkg.com/ulive) [![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/ulive)

**yarn**: `yarn add ulive`

**npm**: `npm i ulive`

**cdn**: https://unpkg.com/ulive

**module**: https://unpkg.com/ulive?module

-   **Small.** 280 bytes gzip.
-   **Fast.**
-   **Simple API**
-   **Reactive.** Automatic derivation.
-   **Value Ref or Observable Syntax**
-   **Circular Detection**

## API

### o(val) or signal(val)

Create a reactive or live state.

```js
import { o, signal, computed, memo, effect } from "ulive";

const num = o(0);
num(10);
console.log(num());
//or

const num = signal(0);
num.value = 10;
console.log(num.value);
```

### effect(fn)

Run fn with automatic dependency check.

```js
let num = o(0);
effect(() => console.log(num()));

//or

let num = signal(0);
effect(() => console.log(num.value));
```

### memo(fn) or computed(fn)

Returns computed/memo value

```js
let num = o(0);
let square = memo(() => num() * num());
let cube = memo(() => square() * num());
effect(() => console.log(num(), square(), cube()));

//or

let num = signal(0);
let square = computed(() => num.value * num.value);
let cube = computed(() => square.value * num.value);
effect(() => console.log(num.value, square.value, cube.value));
```

### toJSON or then or valueOf

```js
const counter = o(0);
const effectCount = o(0);

effect(() => {
	console.log(counter());
	// Whenever this effect is triggered, increase `effectCount`.
	// But we don't want this signal to react to `effectCount`
	effectCount(effectCount.valueOf() + 1);
});

//or
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
const num = o(1);
let square = memo(() => num() * num());
let cube = memo(() => square() * num());
effect(() => console.log(num(), square(), cube()));
num(1);
num(2);
num(3);

//or

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
