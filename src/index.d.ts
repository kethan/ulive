type Func<T> = (v: T) => void;

export interface Observable<T> {
  _r: boolean;
  value: T;
  watch(v: Func<T>): void;
}

export function r<T>(): Observable<T | undefined>;
export function r<T>(val: undefined): Observable<T | undefined>;
export function r<T>(val: T): Observable<T>;