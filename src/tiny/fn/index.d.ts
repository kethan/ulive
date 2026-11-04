export type Observable<T = unknown> = {
    (): T;
    (value: T): void;
    peek: () => T;
    then: () => T;
    toJSON: () => T;
    valueOf: () => T;
    toString: () => T;
};

export function o<T>(): Observable<T | undefined>;
export function o<T>(value: undefined): Observable<T | undefined>;
export function o<T>(value: T): Observable<T>;
export function memo<T>(func: () => T): Observable<T>;
export function effect<T>(func: () => T): () => void | undefined;
export function untracked<T>(func: () => T): T;
export function batch<T>(func: () => T): void;
