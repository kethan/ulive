# ULive

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive) [![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=gzip&label=gzip&style=flat-square)](https://unpkg.com/ulive)

**yarn**: `yarn add ulive`

**npm**: `npm i ulive`

**cdn**: https://unpkg.com/ulive

**module**: https://unpkg.com/ulive?module

-   **Small.** 200 bytes gzip.
-   **Fast.**
-   **Truly reactive.** automatic derivation.
-   **Simple API**

## API

### o(val)

Create a reactive or live state.

```js
const num = o(0);
```

### effect(fn)

Returns: observable

Run fn with automatic dependency check. If the value is returned it acts as computed state.

```js
let num = o(0);
let square = () => num() * num();
let cube = () => square() * num();
effect(() => console.log(num(), square(), cube()));
```

### subscribe and unsubscribe

Subsribe to live changes

```js
const num = o(0);
let unsub = num((val) => console.log(val));
// unsubscribe
unsub();
```

## Usage

```js
const num = o(1);
num((val) => console.log(val));
let square = () => num() * num();
let cube = () => square() * num();
effect(() => console.log(num(), square(), cube()));
num(1);
num(2);
num(3);
```

## Thanks

-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**

## License

MIT
