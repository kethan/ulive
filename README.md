# ULive

[![Version](https://img.shields.io/npm/v/ulive.svg?color=success&style=flat-square)](https://www.npmjs.com/package/ulive)
![Badge size](https://img.badgesize.io/https://unpkg.com/ulive?compression=gzip&label=gzip&style=flat-square)

**npm**: `npm i ulive`

**npm**: `yarn add ulive`

**cdn**: https://unpkg.com/ulive  

**module**: https://unpkg.com/ulive?module

-   **Small.** 200 bytes gzip.
-   **Fast.**
-   **Truly reactive.** automatic derivation.
-   **Simple API**

## API
### r(val)

Create a reactive or live state.

```js
const num = r(0);
```

### effect(fn)

Returns: observable

Run fn with automatic dependency check. If the value is returned it acts as computed state.

```js
const num = r(0);
effect(() => console.log(num.value));
const mul = effect(() => num.value * 2);
```

### subscribe

Subsribe to live changes
```js
const num = r(0);
num.subscribe((val) => console.log(val));
```

## Usage

```js
const num = r(1);
num.subscribe((v) => console.log(v));
const mul = effect(() => num.value * 2);
console.log(num.value);
console.log(mul.value);
```

## Thanks

-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**

## License

MIT
