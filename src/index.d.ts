export type Disposer = () => void;
export type Observable<T = unknown> = {
    (): T;
    (value: T): T;
    (fn: (value: T) => void): Disposer;
    _o: boolean;
};
export function o<T>(): Observable<T | undefined>;
export function o<T>(value: undefined): Observable<T | undefined>;
export function o<T>(value: T): Observable<T>;
export function effect<T>(func: () => T): Observable<T>;
