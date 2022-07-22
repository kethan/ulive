# ULive

### Usage

#### r(val)

```js
let num = r(1);
num.watch((v) => {
	console.log(v);
});
let mul = effect(() => {
	return num.value * 2;
});
console.log(num.value);
console.log(mul.value);
```

## Thanks

-   **[trkl](https://github.com/jbreckmckye/trkl)**
-   **[Emnudge](https://github.com/EmNudge)**

## License

MIT
