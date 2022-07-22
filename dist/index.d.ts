export declare type Func<T> = (v: T) => void;
export interface Observable<T> {
    _r: boolean;
    value: T;
    watch(v: Func<T>): void;
}
export declare function r<T>(): Observable<T | undefined>;
export declare function r<T>(val: undefined): Observable<T | undefined>;
export declare function r<T>(val: T): Observable<T>;
export declare let effect: <T>(func: () => T) => Observable<T>;
