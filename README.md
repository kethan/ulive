# ULive

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive) [![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=brotli&label=brotli&style=flat-square)](https://unpkg.com/ulive) [![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/ulive)

**yarn**: `yarn add ulive`

**npm**: `npm i ulive`

**cdn**: https://unpkg.com/ulive

**module**: https://unpkg.com/ulive?module

-   **Small.** 300 bytes gzip.
-   **Fast.**
-   **Reactive.** automatic derivation.
-   **Value Ref or Observable Syntax**
-   **Simple API**
-   **Circular Detection**

## API

### o(val) or signal(val)

Create a reactive or live state.

```js
import { o, signal, computed, memo, effect, batch } from "ulive";

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

### Subscribe and Unsubscribe

Subscribes a obs/signal and returns a function to unsub

```js
let num = o(0);
let off = num.subscribe((val) => console.log(val));
// unsubscribe
off();

let num = signal(0);
let off = num.subscribe((val) => console.log(val));
// unsubscribe
off();
```

### batch

The batch function allows you to combine multiple signal writes into one single update that is triggered at the end when the callback completes.

```js
const name = o("Jane");
const surname = o("Doe");
const fullName = memo(() => name() + " " + surname());

// Logs: "Jane Doe"
effect(() => console.log(fullName()));

// Combines both signal writes into one update. Once the callback
// returns the `effect` will trigger and we'll log "Foo Bar"
batch(() => {
	name("Foo");
	surname("Bar");
});

//or

const name = signal("Jane");
const surname = signal("Doe");
const fullName = computed(() => name.value + " " + surname.value);

// Logs: "Jane Doe"
effect(() => console.log(fullName.value));

// Combines both signal writes into one update. Once the callback
// returns the `effect` will trigger and we'll log "Foo Bar"
batch(() => {
	name.value = "Foo";
	surname.value = "Bar";
});
```

### peek

```js
const counter = o(0);
const effectCount = o(0);

effect(() => {
	console.log(counter());
	// Whenever this effect is triggered, increase `effectCount`.
	// But we don't want this signal to react to `effectCount`
	effectCount(effectCount.peek() + 1);
});

//or
const counter = signal(0);
const effectCount = signal(0);

effect(() => {
	console.log(counter.value);
	// Whenever this effect is triggered, increase `effectCount`.
	// But we don't want this signal to react to `effectCount`
	effectCount.value = effectCount.peek() + 1;
});
```
## Usage

```js
const num = o(1);
let off = num.on((val) => console.log(val));
let square = memo(() => num() * num());
let cube = memo(() => square() * num());
effect(() => console.log(num(), square(), cube()));
num(1);
num(2);
num(3);
off();

//or

const num = signal(1);
let off = num.on((val) => console.log(val));
let square = computed(() => num.value * num.value);
let cube = computed(() => square.value * num.value);
effect(() => console.log(num.value, square.value, cube.value));
num.value = 1;
num.value = 2;
num.value = 3;
off();
```

## Thanks and Inspiration

-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**
-   **[WebReflection](https://github.com/WebReflection/usignal)**
-   **[Preact](https://github.com/preactjs/signals)**

## License

MIT
