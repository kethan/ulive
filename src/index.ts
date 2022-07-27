let computeFunc: Function;
export type Func<T> = (v: T) => void;
export interface Observable<T> {
  _r: boolean;
  value: T;
  subscribe(v: Func<T>): void;
}

export function r<T>(): Observable<T | undefined>;
export function r<T>(val: undefined): Observable<T | undefined>;
export function r<T>(val: T): Observable<T>;
export function r<T>(val?: T): Observable<T | undefined> {
  let _val = val;
  let _subscribers = new Set<Function>();
  return {
    _r: true,
    get value() {
      if (computeFunc) _subscribers.add(computeFunc);
      return _val!;
    },
    set value(val: T) {
      _val = val;
      _subscribers.forEach((subscribeFunc) => subscribeFunc(val));
    },
    subscribe(func) {
      _subscribers.add(func);
      func(_val);
      return () => _subscribers.delete(func);
    }
  };
}

export let effect = <T>(func: () => T) => {
  let reactor = r<T>();
  let fn = () => {
    if (fn === computeFunc) throw "∞";
    let prevVal = computeFunc;
    computeFunc = fn;
    reactor.value = func();
    computeFunc = prevVal;
  };
  fn();
  return reactor;
};