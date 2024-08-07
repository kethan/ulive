export type Observable<T = unknown> = {
    (): T;
    (value: T): T;
    peek: () => T;
    then: () => T;
    toJSON: () => T;
    valueOf: () => T;
    toString: () => T;
};

export type Signal<T = unknown> = {
    value: T;
    peek: () => T;
    then: () => T;
    toJSON: () => T;
    valueOf: () => T;
    toString: () => T;
};
export function o<T>(): Observable<T | undefined>;
export function o<T>(value: undefined): Observable<T | undefined>;
export function o<T>(value: T): Observable<T>;
export function signal<T>(): Signal<T | undefined>;
export function signal<T>(value: undefined): Signal<T | undefined>;
export function signal<T>(value: T): Signal<T>;
export function effect<T>(func: () => T): void;
export function memo<T>(func: () => T): Observable<T>;
export function computed<T>(func: () => T): Signal<T>;
export function untracked<T>(func: () => T): T;
export function batch<T>(func: () => T): T;
